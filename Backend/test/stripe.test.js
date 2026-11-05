const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    createStripeClient,
    createStripeHandlers,
    processWebhook,
    validatePublicAppUrl
} = require('../src/payments/stripe');
const { courses } = require('../src/payments/catalog');

function createWebhookPool({ orderStatus = 'pending' } = {}) {
    const eventIds = new Set();
    const statements = [];
    const enrollments = new Map();
    return {
        statements,
        enrollments,
        async connect() {
            return {
                async query(sql, values = []) {
                    statements.push({ sql, values });
                    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                        return { rows: [], rowCount: 0 };
                    }
                    if (sql.includes('INSERT INTO payment_webhook_events')) {
                        if (eventIds.has(values[0])) return { rows: [], rowCount: 0 };
                        eventIds.add(values[0]);
                        return { rows: [{ id: eventIds.size }], rowCount: 1 };
                    }
                    if (sql.includes('FROM orders WHERE id = $1 FOR UPDATE')) {
                        return {
                            rows: [{
                                id: '42',
                                user_id: '7',
                                course_id: 'guia-financeiro',
                                amount_cents: 4790,
                                currency: 'BRL',
                                status: orderStatus
                            }],
                            rowCount: 1
                        };
                    }
                    if (sql.includes('FROM payments p') && sql.includes('JOIN orders o')) {
                        return {
                            rows: [{
                                id: '42',
                                user_id: '7',
                                course_id: 'guia-financeiro',
                                amount_cents: 4790
                            }],
                            rowCount: 1
                        };
                    }
                    if (sql.includes('INSERT INTO enrollments')) {
                        enrollments.set(values[2], { userId: values[0], courseId: values[1], status: 'active' });
                    }
                    if (sql.includes("UPDATE enrollments SET status = 'revoked'")) {
                        enrollments.set(values[0], { userId: values[1], courseId: values[2], status: 'revoked' });
                    }
                    return { rows: [], rowCount: 1 };
                },
                release() {}
            };
        }
    };
}

test('Stripe test mode and production URLs are validated', () => {
    assert.throws(() => createStripeClient({
        STRIPE_MODE: 'test',
        STRIPE_SECRET_KEY: 'sk_live_not-for-test'
    }), /must match STRIPE_MODE/);
    assert.equal(createStripeClient({ STRIPE_MODE: 'test' }), null);
    assert.equal(validatePublicAppUrl({
        PUBLIC_APP_URL: 'https://growfy.example/path'
    }, true), 'https://growfy.example');
    assert.equal(validatePublicAppUrl({
        PUBLIC_APP_URL: 'http://growfy.example'
    }, true), null);
    assert.equal(courses['guia-financeiro'].amountCents, 4790);
});

test('only a matching, paid Checkout webhook creates an enrollment, idempotently', async () => {
    const pool = createWebhookPool();
    const event = {
        id: 'evt_checkout_paid',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_example',
                amount_total: 4790,
                currency: 'brl',
                payment_status: 'paid',
                payment_intent: 'pi_example',
                metadata: {
                    order_id: '42',
                    user_id: '7',
                    course_id: 'guia-financeiro'
                }
            }
        }
    };

    assert.deepEqual(await processWebhook(pool, event), { duplicate: false });
    assert.equal(pool.enrollments.size, 1);
    assert.ok(pool.statements.some(({ sql }) => sql.includes("UPDATE orders SET status = 'paid'")));
    assert.ok(pool.statements.some(({ sql }) => sql.includes('INSERT INTO enrollments')));

    const previousStatementCount = pool.statements.length;
    assert.deepEqual(await processWebhook(pool, event), { duplicate: true });
    assert.equal(pool.enrollments.size, 1);
    assert.equal(pool.statements.length, previousStatementCount + 3);
});

test('a Checkout webhook whose amount or metadata differs from the order fails closed', async () => {
    const pool = createWebhookPool();
    const event = {
        id: 'evt_checkout_mismatch',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_mismatch',
                amount_total: 1,
                currency: 'brl',
                payment_status: 'paid',
                metadata: {
                    order_id: '42',
                    user_id: '7',
                    course_id: 'guia-financeiro'
                }
            }
        }
    };
    await assert.rejects(processWebhook(pool, event), /do not match/);
    assert.equal(pool.enrollments.size, 0);
    assert.ok(pool.statements.some(({ sql }) => sql === 'ROLLBACK'));
});

test('a later checkout event cannot restore a refunded order', async () => {
    const pool = createWebhookPool({ orderStatus: 'refunded' });
    const event = {
        id: 'evt_checkout_after_refund',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_refunded',
                amount_total: 4790,
                currency: 'brl',
                payment_status: 'paid',
                payment_intent: 'pi_refunded',
                metadata: {
                    order_id: '42',
                    user_id: '7',
                    course_id: 'guia-financeiro'
                }
            }
        }
    };
    await processWebhook(pool, event);
    assert.equal(pool.enrollments.size, 0);
    assert.ok(!pool.statements.some(({ sql }) => sql.includes('INSERT INTO enrollments')));
});

test('a signed full-refund event revokes the matching enrollment', async () => {
    const pool = createWebhookPool({ orderStatus: 'paid' });
    pool.enrollments.set('42', {
        userId: '7',
        courseId: 'guia-financeiro',
        status: 'active'
    });
    const event = {
        id: 'evt_full_refund',
        type: 'charge.refunded',
        data: {
            object: {
                payment_intent: 'pi_refunded',
                amount: 4790,
                amount_refunded: 4790,
                currency: 'brl'
            }
        }
    };
    await processWebhook(pool, event, {
        stripe: {
            paymentIntents: {
                async retrieve() {
                    return {
                        id: 'pi_refunded',
                        amount: 4790,
                        currency: 'brl',
                        metadata: {
                            order_id: '42',
                            user_id: '7',
                            course_id: 'guia-financeiro'
                        }
                    };
                }
            }
        }
    });
    assert.equal(pool.enrollments.get('42').status, 'revoked');
});

test('a partial refund updates its state without treating it as a full revocation', async () => {
    const pool = createWebhookPool({ orderStatus: 'paid' });
    pool.enrollments.set('42', {
        userId: '7',
        courseId: 'guia-financeiro',
        status: 'active'
    });
    const event = {
        id: 'evt_partial_refund',
        type: 'charge.refunded',
        data: {
            object: {
                payment_intent: 'pi_partial',
                amount: 4790,
                amount_refunded: 1000,
                currency: 'brl'
            }
        }
    };
    await processWebhook(pool, event, {
        stripe: {
            paymentIntents: {
                async retrieve() {
                    return {
                        id: 'pi_partial',
                        amount: 4790,
                        currency: 'brl',
                        metadata: {
                            order_id: '42',
                            user_id: '7',
                            course_id: 'guia-financeiro'
                        }
                    };
                }
            }
        }
    });
    assert.equal(pool.enrollments.get('42').status, 'active');
});

test('Stripe Checkout always uses the server catalog amount and an order-stable idempotency key', async () => {
    const executed = [];
    const pool = {
        async connect() {
            return {
                async query(sql, values = []) {
                    executed.push({ sql, values });
                    if (sql.includes('SELECT status FROM enrollments')) return { rows: [], rowCount: 0 };
                    if (sql.includes('FROM orders o') && sql.includes('idempotency_key')) {
                        return { rows: [], rowCount: 0 };
                    }
                    if (sql.includes("o.status = 'pending'")) return { rows: [], rowCount: 0 };
                    if (sql.includes('INSERT INTO orders')) {
                        return {
                            rows: [{
                                id: '99',
                                user_id: '7',
                                course_id: 'guia-financeiro',
                                amount_cents: 4790,
                                status: 'pending'
                            }],
                            rowCount: 1
                        };
                    }
                    return { rows: [], rowCount: 1 };
                },
                release() {}
            };
        },
        async query(sql, values) {
            executed.push({ sql, values });
            return { rows: [], rowCount: 1 };
        }
    };
    let checkoutArguments;
    const stripe = {
        checkout: {
            sessions: {
                async create(parameters, options) {
                    checkoutArguments = { parameters, options };
                    return {
                        id: 'cs_test_checkout',
                        url: 'https://checkout.stripe.com/c/pay/test'
                    };
                }
            }
        }
    };
    const { checkout } = createStripeHandlers({
        database: pool,
        stripe,
        env: {
            STRIPE_WEBHOOK_SECRET: 'whsec_test',
            PUBLIC_APP_URL: 'http://localhost:3000'
        },
        isProduction: false,
        allowedOrigins: new Set(['http://localhost:3000'])
    });
    const response = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
    await checkout({
        body: { courseId: 'guia-financeiro', amount: 1 },
        user: { id: '7', email: 'buyer@example.com' },
        get(name) {
            return name === 'Idempotency-Key' ? 'stable-client-attempt-001' : undefined;
        }
    }, response, (error) => {
        if (error) throw error;
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.checkoutUrl, 'https://checkout.stripe.com/c/pay/test');
    assert.equal(checkoutArguments.parameters.line_items[0].price_data.unit_amount, 4790);
    assert.equal(checkoutArguments.parameters.line_items[0].price_data.currency, 'brl');
    assert.equal(checkoutArguments.parameters.metadata.order_id, '99');
    assert.equal(checkoutArguments.options.idempotencyKey, 'growfy-checkout-order-99');
});
