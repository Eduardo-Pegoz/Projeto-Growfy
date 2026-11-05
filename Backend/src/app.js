const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const { createPool } = require('./config/database');
const { createStripeClient, createStripeHandlers } = require('./payments/stripe');

const SESSION_COOKIE = 'growfy_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function readCookie(req, name) {
    const cookieHeader = req.headers.cookie || '';
    for (const part of cookieHeader.split(';')) {
        const separator = part.indexOf('=');
        if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
        try {
            return decodeURIComponent(part.slice(separator + 1).trim());
        } catch {
            return null;
        }
    }
    return null;
}

function sessionCookieOptions(isProduction) {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_DURATION_MS
    };
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(email) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAllowedOrigins(env) {
    return new Set(
        (env.FRONTEND_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
    );
}

function validateProductionConfig(env, allowedOrigins) {
    if (env.NODE_ENV !== 'production') return;
    for (const origin of allowedOrigins) {
        const parsedOrigin = new URL(origin);
        if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) {
            throw new Error('Production FRONTEND_ORIGINS must contain HTTPS origins without paths.');
        }
    }
}

function applySecurityHeaders(isProduction, req, res, next) {
    res.set({
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' https://cdnjs.cloudflare.com",
            "style-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com 'unsafe-inline'",
            "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            'upgrade-insecure-requests'
        ].join('; '),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    if (isProduction) {
        res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
}

function createApp({ pool, env = process.env, stripeClient } = {}) {
    const database = pool || createPool(env);
    const app = express();
    const allowedOrigins = getAllowedOrigins(env);
    const isProduction = env.NODE_ENV === 'production';
    validateProductionConfig(env, allowedOrigins);
    const stripe = stripeClient || createStripeClient(env);
    const stripeHandlers = createStripeHandlers({
        database,
        stripe,
        env,
        isProduction,
        allowedOrigins
    });

    app.disable('x-powered-by');
    app.use((req, res, next) => applySecurityHeaders(isProduction, req, res, next));
    app.use((req, res, next) => {
        const origin = req.get('Origin');
        if (!origin) return next();
        if (!allowedOrigins.has(origin)) {
            return res.status(403).json({ error: 'Origem não permitida.' });
        }
        res.set({
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Vary': 'Origin'
        });
        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            return res.sendStatus(204);
        }
        next();
    });

    app.post(
        '/api/payments/stripe/webhook',
        express.raw({ type: 'application/json', limit: '1mb' }),
        stripeHandlers.webhook
    );
    app.use(express.json({ limit: '16kb', strict: true }));

    const requireAllowedOrigin = (req, res, next) => {
        const origin = req.get('Origin');
        if (!origin || !allowedOrigins.has(origin)) {
            return res.status(403).json({ error: 'Origem não permitida.' });
        }
        next();
    };

    const authRateLimit = asyncRoute(async (req, res, next) => {
        const ipHash = hashToken(req.ip || req.socket.remoteAddress || 'unknown');
        const rateKey = hashToken(`${req.path}:${ipHash}`);
        const result = await database.query(
            `INSERT INTO auth_rate_limits (rate_key, request_count, window_started_at)
             VALUES ($1, 1, NOW())
             ON CONFLICT (rate_key) DO UPDATE SET
                request_count = CASE
                    WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1
                    ELSE auth_rate_limits.request_count + 1
                END,
                window_started_at = CASE
                    WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW()
                    ELSE auth_rate_limits.window_started_at
                END
             RETURNING request_count`,
            [rateKey]
        );

        if (result.rows[0].request_count > 10) {
            res.set('Retry-After', '900');
            return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
        }
        next();
    });

    const requireUser = asyncRoute(async (req, res, next) => {
        const token = readCookie(req, SESSION_COOKIE);
        if (!token || token.length > 200) {
            return res.status(401).json({ error: 'Autenticação necessária.' });
        }
        const tokenHash = hashToken(token);
        const result = await database.query(
            `SELECT u.id, u.name, u.email, u.created_at
             FROM user_sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
            [tokenHash]
        );
        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }
        req.user = result.rows[0];
        req.sessionTokenHash = tokenHash;
        next();
    });

    app.get('/api/health', asyncRoute(async (req, res) => {
        await database.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    }));

    app.post('/api/auth/register', requireAllowedOrigin, authRateLimit, asyncRoute(async (req, res) => {
        const body = req.body || {};
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const email = normalizeEmail(body.email);
        const password = typeof body.password === 'string' ? body.password : '';
        const passwordBytes = Buffer.byteLength(password, 'utf8');
        if (name.length < 2 || name.length > 80 || !validEmail(email) ||
            password.length < 12 || passwordBytes > 72) {
            return res.status(400).json({
                error: 'Informe nome e e-mail válidos e uma senha de 12 a 72 bytes.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        let user;
        try {
            const result = await database.query(
                'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
                [name, email, passwordHash]
            );
            user = result.rows[0];
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Não foi possível criar a conta com esses dados.' });
            }
            throw error;
        }
        await createSession(database, user.id, res, isProduction);
        res.status(201).json({ user });
    }));

    app.post('/api/auth/login', requireAllowedOrigin, authRateLimit, asyncRoute(async (req, res) => {
        const body = req.body || {};
        const email = normalizeEmail(body.email);
        const password = typeof body.password === 'string' ? body.password : '';
        const result = await database.query(
            'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];
        const passwordMatches = user && password.length <= 72
            ? await bcrypt.compare(password, user.password_hash)
            : false;
        if (!passwordMatches) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        }
        await createSession(database, user.id, res, isProduction);
        res.json({
            user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at }
        });
    }));

    app.post('/api/auth/logout', requireAllowedOrigin, requireUser, asyncRoute(async (req, res) => {
        await database.query('DELETE FROM user_sessions WHERE token_hash = $1', [req.sessionTokenHash]);
        res.clearCookie(SESSION_COOKIE, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/'
        });
        res.sendStatus(204);
    }));

    app.post('/api/auth/password-reset/request', requireAllowedOrigin, authRateLimit, asyncRoute(async (req, res) => {
        const email = normalizeEmail((req.body || {}).email);
        if (!validEmail(email)) {
            return res.status(400).json({ error: 'Informe um e-mail válido.' });
        }
        const { createTransport } = require('nodemailer');
        const smtpHost = env.SMTP_HOST;
        const smtpUser = env.SMTP_USER;
        const smtpPassword = env.SMTP_PASSWORD;
        if (!smtpHost || !smtpUser || !smtpPassword || !env.MAIL_FROM) {
            return res.status(503).json({
                error: 'A recuperação de senha ainda não está configurada. Entre em contato com o suporte.'
            });
        }
        const appUrl = (env.PUBLIC_APP_URL || (isProduction ? '' : 'http://localhost:3000')).replace(/\/+$/, '');
        let parsedAppUrl;
        try {
            parsedAppUrl = new URL(appUrl);
        } catch {
            return res.status(503).json({ error: 'A URL pública para redefinição de senha não está configurada.' });
        }
        if (!['http:', 'https:'].includes(parsedAppUrl.protocol) ||
            (isProduction && parsedAppUrl.protocol !== 'https:') ||
            !allowedOrigins.has(parsedAppUrl.origin)) {
            return res.status(503).json({ error: 'A URL pública para redefinição de senha não está configurada.' });
        }

        const userResult = await database.query('SELECT id, email FROM users WHERE email = $1', [email]);
        if (userResult.rowCount === 1) {
            const user = userResult.rows[0];
            const rawToken = crypto.randomBytes(32).toString('base64url');
            const tokenHash = hashToken(rawToken);
            await database.query(
                'DELETE FROM password_reset_tokens WHERE user_id = $1',
                [user.id]
            );
            await database.query(
                'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
                [tokenHash, user.id]
            );
            const resetUrl = `${parsedAppUrl.origin}/reset-password.html?token=${encodeURIComponent(rawToken)}`;
            try {
                const transporter = createTransport({
                    host: smtpHost,
                    port: Number(env.SMTP_PORT || 587),
                    secure: env.SMTP_SECURE === 'true',
                    requireTLS: env.SMTP_SECURE !== 'true',
                    auth: { user: smtpUser, pass: smtpPassword }
                });
                await transporter.sendMail({
                    from: env.MAIL_FROM,
                    to: user.email,
                    subject: 'Redefinição de senha Growfy',
                    text: `Use este link para redefinir sua senha em até uma hora: ${resetUrl}`
                });
            } catch (error) {
                await database.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
                throw error;
            }
        }
        res.status(202).json({
            message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.'
        });
    }));

    app.post('/api/auth/password-reset/complete', requireAllowedOrigin, authRateLimit, asyncRoute(async (req, res) => {
        const body = req.body || {};
        const token = typeof body.token === 'string' ? body.token : '';
        const password = typeof body.password === 'string' ? body.password : '';
        if (token.length < 32 || token.length > 100 || password.length < 12 ||
            Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ error: 'Link inválido ou senha fora dos critérios.' });
        }
        const tokenHash = hashToken(token);
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await database.query(
            `WITH valid_token AS (
                 SELECT user_id FROM password_reset_tokens
                 WHERE token_hash = $1 AND expires_at > NOW()
             ),
             changed_user AS (
                 UPDATE users SET password_hash = $2
                 WHERE id = (SELECT user_id FROM valid_token)
                 RETURNING id
             ),
             removed_token AS (
                 DELETE FROM password_reset_tokens
                 WHERE token_hash = $1 AND EXISTS (SELECT 1 FROM changed_user)
                 RETURNING user_id
             )
             SELECT changed_user.id
             FROM changed_user
             JOIN removed_token ON removed_token.user_id = changed_user.id`,
            [tokenHash, passwordHash]
        );
        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Link inválido ou expirado. Solicite uma nova redefinição.' });
        }
        await database.query('DELETE FROM user_sessions WHERE user_id = $1', [result.rows[0].id]);
        res.json({ message: 'Senha redefinida. Entre novamente com sua nova senha.' });
    }));

    app.get('/api/auth/session', requireUser, (req, res) => {
        res.json({ user: req.user });
    });

    app.get('/api/user/profile', requireUser, (req, res) => {
        res.json({ user: req.user });
    });

    app.get('/api/user/courses', requireUser, asyncRoute(async (req, res) => {
        const result = await database.query(
            `SELECT course_id, purchased_at AS purchase_date
             FROM enrollments
             WHERE user_id = $1 AND status = 'active'
             ORDER BY purchased_at DESC`,
            [req.user.id]
        );
        res.json({ courses: result.rows });
    }));

    app.post('/api/checkout', requireAllowedOrigin, authRateLimit, requireUser, stripeHandlers.checkout);

    app.get('/api/payments/session/:sessionId', requireUser, asyncRoute(async (req, res) => {
        if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(req.params.sessionId)) {
            return res.status(400).json({ error: 'Sessão de pagamento inválida.' });
        }
        const result = await database.query(
            `SELECT o.status, o.course_id
             FROM payments p
             JOIN orders o ON o.id = p.order_id
             WHERE p.provider = 'stripe'
               AND p.stripe_checkout_session_id = $1
               AND o.user_id = $2`,
            [req.params.sessionId, req.user.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pagamento não encontrado.' });
        }
        res.json({ status: result.rows[0].status, courseId: result.rows[0].course_id });
    }));

    app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));

    app.use(express.static(path.join(__dirname, '..', '..', 'Frontend'), {
        dotfiles: 'deny',
        index: 'index.html',
        maxAge: isProduction ? '1h' : 0
    }));

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
            return res.status(400).json({ error: 'Corpo JSON inválido.' });
        }
        console.error('Request failed:', error.message);
        res.status(500).json({ error: 'Erro interno. Tente novamente mais tarde.' });
    });

    app.locals.database = database;
    return app;
}

async function createSession(database, userId, res, isProduction) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await database.query(
        'INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [hashToken(token), userId, expiresAt]
    );
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(isProduction));
}

module.exports = {
    SESSION_COOKIE,
    createApp,
    getAllowedOrigins,
    hashToken,
    normalizeEmail,
    readCookie,
    sessionCookieOptions,
    validEmail,
    validateProductionConfig
};