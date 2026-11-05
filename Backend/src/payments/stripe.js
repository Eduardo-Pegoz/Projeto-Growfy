const crypto = require('node:crypto');
const express = require('express');
const Stripe = require('stripe');
const { courses } = require('./catalog');

function createStripeClient(env) {
    if (!env.STRIPE_SECRET_KEY) return null;
    if (!env.STRIPE_SECRET_KEY.startsWith('sk_test_') &&
        !env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
        throw new Error('STRIPE_SECRET_KEY must be a Stripe secret key.');
    }
    const mode = env.STRIPE_MODE || 'test';
    if (mode !== 'test' && mode !== 'live') {
        throw new Error('STRIPE_MODE must be either test or live.');
    }
    const expectedPrefix = mode === 'live' ? 'sk_live_' : 'sk_test_';
    if (!env.STRIPE_SECRET_KEY.startsWith(expectedPrefix)) {
        throw new Error(`STRIPE_SECRET_KEY must match STRIPE_MODE=${mode}.`);
    }
    return new Stripe(env.STRIPE_SECRET_KEY);
}

function validatePublicAppUrl(env, isProduction) {
    const value = env.PUBLIC_APP_URL || (isProduction ? '' : 'http://localhost:3000');
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        return null;
    }
    if (!['http:', 'https:'].includes(parsed.protocol) ||
        (isProduction && parsed.protocol !== 'https:') ||
        parsed.username || parsed.password) {
        return null;
    }
    return parsed.origin;
}

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

async function createOrder(pool, userId, courseId, idempotencyKey) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const lockId = Number.parseInt(sha256(`${userId}:${courseId}`).slice(0, 8), 16);
        await client.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
        const enrollment = await client.query(
            `SELECT status FROM enrollments
             WHERE user_id = $1 AND course_id = $2
             FOR UPDATE`,
            [userId, courseId]
        );
        if (enrollment.rows.some((row) => row.status === 'active')) {
            const error = new Error('Você já tem acesso a este curso.');
            error.statusCode = 409;
            throw error;
        }

        const previous = await client.query(
            `SELECT o.id, o.user_id, o.course_id, o.amount_cents, o.status,
                    p.stripe_checkout_session_id
             FROM orders o
             LEFT JOIN payments p ON p.order_id = o.id AND p.provider = 'stripe'
             WHERE o.idempotency_key = $1 FOR UPDATE OF o`,
            [idempotencyKey]
        );
        if (previous.rowCount > 0) {
            const order = previous.rows[0];
            if (String(order.user_id) !== String(userId) || order.course_id !== courseId) {
                const error = new Error('A chave de idempotência já foi usada para outra compra.');
                error.statusCode = 409;
                throw error;
            }
            if (order.status !== 'pending') {
                const error = new Error('Esta tentativa de compra já foi finalizada. Inicie uma nova compra.');
                error.statusCode = 409;
                throw error;
            }
            await client.query('COMMIT');
            return { ...order, isNew: false };
        }
        const pending = await client.query(
            `SELECT o.id, o.user_id, o.course_id, o.amount_cents, o.status,
                    p.stripe_checkout_session_id
             FROM orders o
             LEFT JOIN payments p ON p.order_id = o.id AND p.provider = 'stripe'
             WHERE o.user_id = $1 AND o.course_id = $2 AND o.status = 'pending'
             FOR UPDATE OF o`,
            [userId, courseId]
        );
        if (pending.rowCount > 0) {
            await client.query('COMMIT');
            return { ...pending.rows[0], isNew: false };
        }

        const course = courses[courseId];
        const inserted = await client.query(
            `INSERT INTO orders
                (user_id, course_id, amount_cents, currency, status, idempotency_key)
             VALUES ($1, $2, $3, 'BRL', 'pending', $4)
             RETURNING id, user_id, course_id, amount_cents, status`,
            [userId, courseId, course.amountCents, idempotencyKey]
        );
        const order = inserted.rows[0];
        await client.query(
            `INSERT INTO payments (order_id, provider, status, amount_cents, currency)
             VALUES ($1, 'stripe', 'pending', $2, 'BRL')`,
            [order.id, course.amountCents]
        );
        await client.query('COMMIT');
        return { ...order, isNew: true };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function attachCheckoutSession(pool, orderId, session) {
    await pool.query(
        `UPDATE payments
         SET stripe_checkout_session_id = $2, updated_at = NOW()
         WHERE order_id = $1 AND provider = 'stripe'`,
        [orderId, session.id]
    );
}

async function processWebhook(pool, event, { stripe } = {}) {
    let paymentIntent = null;
    if (event.type === 'charge.refunded' && event.data.object.payment_intent && stripe) {
        paymentIntent = await stripe.paymentIntents.retrieve(event.data.object.payment_intent);
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const rawPayload = Buffer.from(JSON.stringify(event));
        const insertedEvent = await client.query(
            `INSERT INTO payment_webhook_events
                (provider, provider_event_id, event_type, payload_sha256, processed_at)
             VALUES ('stripe', $1, $2, $3, NOW())
             ON CONFLICT (provider, provider_event_id) DO NOTHING
             RETURNING id`,
            [event.id, event.type, sha256(rawPayload)]
        );
        if (insertedEvent.rowCount === 0) {
            await client.query('COMMIT');
            return { duplicate: true };
        }

        if (event.type.startsWith('checkout.session.')) {
            await processCheckoutEvent(client, event);
        } else if (event.type === 'charge.refunded') {
            await processRefundEvent(client, event, paymentIntent);
        }

        await client.query(
            `UPDATE payment_webhook_events
             SET processed_at = NOW()
             WHERE provider = 'stripe' AND provider_event_id = $1`,
            [event.id]
        );
        await client.query('COMMIT');
        return { duplicate: false };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function processCheckoutEvent(client, event) {
    const session = event.data.object;
    const orderId = session.metadata && session.metadata.order_id;
    if (!orderId || !/^\d+$/.test(orderId)) {
        throw new Error('Stripe Checkout session has no valid Growfy order id.');
    }
    const result = await client.query(
        `SELECT id, user_id, course_id, amount_cents, currency, status
         FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
    );
    if (result.rowCount !== 1) throw new Error('Growfy order referenced by Stripe was not found.');
    const order = result.rows[0];
    if (String(session.metadata.user_id) !== String(order.user_id) ||
        session.metadata.course_id !== order.course_id ||
        session.currency !== order.currency.toLowerCase() ||
        session.amount_total !== order.amount_cents) {
        throw new Error('Stripe Checkout values do not match the stored Growfy order.');
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent && session.payment_intent.id;
    await client.query(
        `UPDATE payments
         SET stripe_checkout_session_id = $2,
             provider_payment_id = COALESCE($3, provider_payment_id),
             updated_at = NOW()
         WHERE order_id = $1 AND provider = 'stripe'`,
        [order.id, session.id, paymentIntentId || null]
    );

    const isPaidEvent = event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded';
    if (isPaidEvent && session.payment_status === 'paid') {
        await client.query(
            `UPDATE orders SET status = 'paid', updated_at = NOW()
             WHERE id = $1 AND status IN ('pending', 'failed', 'cancelled')`,
            [order.id]
        );
        if (order.status !== 'refunded' && order.status !== 'partially_refunded') {
            await client.query(
                `UPDATE payments SET status = 'approved', updated_at = NOW()
                 WHERE order_id = $1 AND provider = 'stripe'
                   AND status NOT IN ('refunded', 'partially_refunded')`,
                [order.id]
            );
        }
        if (order.status === 'refunded' || order.status === 'partially_refunded') return;
        await client.query(
            `INSERT INTO enrollments (user_id, course_id, order_id, status, purchased_at)
             VALUES ($1, $2, $3, 'active', NOW())
             ON CONFLICT (user_id, course_id) DO UPDATE
             SET order_id = EXCLUDED.order_id,
                 status = 'active',
                 purchased_at = NOW()`,
            [order.user_id, order.course_id, order.id]
        );
        return;
    }

    if (event.type === 'checkout.session.expired' ||
        event.type === 'checkout.session.async_payment_failed') {
        const targetStatus = event.type === 'checkout.session.expired' ? 'cancelled' : 'failed';
        const targetPaymentStatus = event.type === 'checkout.session.expired' ? 'cancelled' : 'rejected';
        await client.query(
            `UPDATE orders SET status = $2, updated_at = NOW()
             WHERE id = $1 AND status = 'pending'`,
            [order.id, targetStatus]
        );
        await client.query(
            `UPDATE payments SET status = $2, updated_at = NOW()
             WHERE order_id = $1 AND provider = 'stripe' AND status = 'pending'`,
            [order.id, targetPaymentStatus]
        );
    }
}

async function processRefundEvent(client, event, paymentIntent) {
    const charge = event.data.object;
    if (!charge.payment_intent) return;
    if (!Number.isSafeInteger(charge.amount) || charge.amount <= 0 ||
        !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < 0 ||
        charge.amount_refunded > charge.amount || charge.currency !== 'brl') {
        throw new Error('Stripe refund event contains invalid amount or currency values.');
    }
    const metadata = paymentIntent && paymentIntent.metadata;
    const orderId = metadata && /^\d+$/.test(metadata.order_id || '')
        ? metadata.order_id
        : null;
    const result = await client.query(
        `SELECT o.id, o.user_id, o.course_id, o.amount_cents
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE p.provider = 'stripe'
           AND (p.provider_payment_id = $1 OR o.id = $2)
         FOR UPDATE OF o`,
        [charge.payment_intent, orderId]
    );
    if (result.rowCount === 0) return;
    const order = result.rows[0];
    if (metadata && (String(metadata.user_id) !== String(order.user_id) ||
        metadata.course_id !== order.course_id)) {
        throw new Error('Stripe refund metadata does not match the Growfy order.');
    }
    if (paymentIntent && (paymentIntent.id !== charge.payment_intent ||
        paymentIntent.amount !== order.amount_cents ||
        paymentIntent.currency !== 'brl' ||
        charge.amount !== order.amount_cents)) {
        throw new Error('Stripe refund amount does not match the Growfy order.');
    }
    const isFullyRefunded = charge.amount_refunded >= charge.amount;
    const refundStatus = isFullyRefunded ? 'refunded' : 'partially_refunded';
    await client.query(
        `UPDATE payments
         SET provider_payment_id = COALESCE(provider_payment_id, $3),
             status = $2, updated_at = NOW()
         WHERE order_id = $1 AND provider = 'stripe'`,
        [order.id, refundStatus, charge.payment_intent]
    );
    await client.query(
        `UPDATE orders SET status = $2, updated_at = NOW()
         WHERE id = $1 AND status IN ('pending', 'paid', 'failed', 'cancelled', 'partially_refunded')`,
        [order.id, refundStatus]
    );
    if (isFullyRefunded) {
        await client.query(
            `UPDATE enrollments SET status = 'revoked'
             WHERE order_id = $1 AND user_id = $2 AND course_id = $3`,
            [order.id, order.user_id, order.course_id]
        );
    }
}

function createStripeHandlers({ database, stripe, env, isProduction, allowedOrigins }) {
    const publicAppUrl = validatePublicAppUrl(env, isProduction);

    const checkout = asyncRoute(async (req, res) => {
        if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
            return res.status(503).json({
                error: 'Stripe ainda não está configurado no servidor.',
                code: 'STRIPE_NOT_CONFIGURED'
            });
        }
        if (!publicAppUrl || (allowedOrigins && !allowedOrigins.has(publicAppUrl))) {
            return res.status(503).json({
                error: 'PUBLIC_APP_URL precisa apontar para a origem HTTPS do site em produção.',
                code: 'PUBLIC_APP_URL_NOT_CONFIGURED'
            });
        }
        const courseId = typeof (req.body || {}).courseId === 'string'
            ? req.body.courseId
            : '';
        const course = courses[courseId];
        if (!course) return res.status(400).json({ error: 'Curso inválido.' });
        const idempotencyKey = req.get('Idempotency-Key') || '';
        if (!/^[\w-]{16,128}$/.test(idempotencyKey)) {
            return res.status(400).json({ error: 'Chave de idempotência inválida.' });
        }

        let order;
        try {
            order = await createOrder(database, req.user.id, courseId, idempotencyKey);
        } catch (error) {
            if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Esta compra já está sendo processada. Tente novamente.' });
            }
            throw error;
        }

        const session = order.stripe_checkout_session_id
            ? await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id)
            : await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            client_reference_id: String(order.id),
            customer_email: req.user.email,
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: 'brl',
                    unit_amount: course.amountCents,
                    product_data: { name: course.name }
                }
            }],
            metadata: {
                order_id: String(order.id),
                user_id: String(req.user.id),
                course_id: courseId
            },
            payment_intent_data: {
                metadata: {
                    order_id: String(order.id),
                    user_id: String(req.user.id),
                    course_id: courseId
                }
            },
            success_url: `${publicAppUrl}/pagamento.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${publicAppUrl}/curso.html?course=${encodeURIComponent(courseId)}&checkout=cancelled`
        }, {
            idempotencyKey: `growfy-checkout-order-${order.id}`
        });
        if (!session.url || !session.id) {
            throw new Error('Stripe did not return a valid Checkout URL.');
        }
        await attachCheckoutSession(database, order.id, session);
        res.status(200).json({ checkoutUrl: session.url });
    });

    const webhook = asyncRoute(async (req, res) => {
        if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
            return res.status(503).json({ error: 'Stripe webhook não está configurado.' });
        }
        const signature = req.get('stripe-signature');
        if (!signature || !Buffer.isBuffer(req.body)) {
            return res.status(400).json({ error: 'Assinatura ou payload do webhook inválido.' });
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch {
            return res.status(400).json({ error: 'Assinatura Stripe inválida.' });
        }
        if (typeof event.livemode !== 'boolean' ||
            event.livemode !== (env.STRIPE_MODE === 'live')) {
            return res.status(400).json({ error: 'Modo do evento Stripe não corresponde ao ambiente configurado.' });
        }
        await processWebhook(database, event, { stripe });
        res.json({ received: true });
    });

    return { checkout, webhook };
}

module.exports = {
    createOrder,
    createStripeClient,
    createStripeHandlers,
    processWebhook,
    validatePublicAppUrl
};
