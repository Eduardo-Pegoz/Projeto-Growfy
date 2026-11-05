const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const {
    SESSION_COOKIE,
    createApp,
    getAllowedOrigins,
    hashToken,
    normalizeEmail,
    readCookie,
    sessionCookieOptions,
    validEmail
} = require('../server');

function createMemoryPool() {
    const users = new Map();
    const sessions = new Map();
    const courses = [];
    const webhookEvents = new Set();
    let nextUserId = 1;
    return {
        users,
        sessions,
        async connect() {
            return {
                async query(sql, values = []) {
                    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                        return { rows: [], rowCount: 0 };
                    }
                    if (sql.includes('INSERT INTO payment_webhook_events')) {
                        if (webhookEvents.has(values[0])) return { rows: [], rowCount: 0 };
                        webhookEvents.add(values[0]);
                        return { rows: [{ id: webhookEvents.size }], rowCount: 1 };
                    }
                    return { rows: [], rowCount: 0 };
                },
                release() {}
            };
        },
        async query(sql, values = []) {
            if (sql.includes('SELECT 1')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
            if (sql.includes('INSERT INTO auth_rate_limits')) {
                return { rows: [{ request_count: 1 }], rowCount: 1 };
            }
            if (sql.includes('INSERT INTO users')) {
                const [, email] = values;
                if ([...users.values()].some((user) => user.email === email)) {
                    const error = new Error('duplicate email');
                    error.code = '23505';
                    throw error;
                }
                const user = {
                    id: nextUserId++,
                    name: values[0],
                    email,
                    password_hash: values[2],
                    created_at: new Date().toISOString()
                };
                users.set(user.id, user);
                return { rows: [{ ...user, password_hash: undefined }], rowCount: 1 };
            }
            if (sql.includes('INSERT INTO user_sessions')) {
                sessions.set(values[0], { userId: values[1], expiresAt: new Date(values[2]) });
                return { rows: [], rowCount: 1 };
            }
            if (sql.includes('FROM user_sessions s')) {
                const session = sessions.get(values[0]);
                const user = session && session.expiresAt > new Date()
                    ? users.get(session.userId)
                    : null;
                return {
                    rows: user ? [{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        created_at: user.created_at
                    }] : [],
                    rowCount: user ? 1 : 0
                };
            }
            if (sql.includes('SELECT id, name, email, password_hash, created_at FROM users')) {
                const user = [...users.values()].find((item) => item.email === values[0]);
                return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
            }
            if (sql.includes('DELETE FROM user_sessions WHERE token_hash')) {
                const removed = sessions.delete(values[0]);
                return { rows: [], rowCount: removed ? 1 : 0 };
            }
            if (sql.includes('DELETE FROM user_sessions WHERE user_id')) {
                const matching = [...sessions.entries()]
                    .filter(([, session]) => session.userId === values[0]);
                matching.forEach(([tokenHash]) => sessions.delete(tokenHash));
                return { rows: [], rowCount: matching.length };
            }
            if (sql.includes('FROM enrollments')) {
                return { rows: courses.filter((course) => course.user_id === values[0]), rowCount: 0 };
            }
            if (sql.startsWith('DELETE FROM auth_rate_limits')) return { rows: [], rowCount: 0 };
            throw new Error(`Unexpected test query: ${sql}`);
        }
    };
}

const pool = createMemoryPool();
const app = createApp({
    pool,
    env: {
        NODE_ENV: 'test',
        FRONTEND_ORIGINS: 'http://localhost'
    },
    stripeClient: null
});
let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
});

test('helpers normalize inputs and configure secure cookie attributes', () => {
    assert.equal(normalizeEmail('  TEST@Example.com '), 'test@example.com');
    assert.equal(validEmail('person@example.com'), true);
    assert.equal(validEmail('not-an-email'), false);
    assert.equal(getAllowedOrigins({ FRONTEND_ORIGINS: 'https://app.example, https://admin.example' }).size, 2);
    assert.notEqual(hashToken('session-token'), 'session-token');
    assert.deepEqual(readCookie({ headers: { cookie: `${SESSION_COOKIE}=abc%2F123; other=value` } }, SESSION_COOKIE), 'abc/123');
    assert.equal(sessionCookieOptions(true).httpOnly, true);
    assert.equal(sessionCookieOptions(true).secure, true);
    assert.equal(sessionCookieOptions(true).sameSite, 'lax');
});

test('registration, session profile, course list, login, and logout work with an HttpOnly cookie', async () => {
    const origin = 'http://localhost';
    const registration = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Growfy Test',
            email: 'TEST@example.com',
            password: 'a-secure-password-123'
        })
    });
    assert.equal(registration.status, 201);
    assert.equal(registration.headers.get('x-frame-options'), 'DENY');
    assert.match(registration.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    const cookieHeader = registration.headers.get('set-cookie');
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    assert.doesNotMatch(cookieHeader, /password_hash|a-secure-password/);
    const cookie = cookieHeader.split(';')[0];
    const user = await registration.json();
    assert.equal(user.user.email, 'test@example.com');
    assert.equal('password_hash' in user.user, false);

    const session = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: cookie }
    });
    assert.equal(session.status, 200);

    const courses = await fetch(`${baseUrl}/api/user/courses`, {
        headers: { Cookie: cookie }
    });
    assert.equal(courses.status, 200);
    assert.deepEqual(await courses.json(), { courses: [] });

    const wrongLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' })
    });
    assert.equal(wrongLogin.status, 401);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'a-secure-password-123' })
    });
    assert.equal(login.status, 200);
    const loginCookie = login.headers.get('set-cookie').split(';')[0];

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Origin: origin, Cookie: loginCookie, 'Content-Type': 'application/json' },
        body: '{}'
    });
    assert.equal(logout.status, 204);
    const revokedSession = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: loginCookie }
    });
    assert.equal(revokedSession.status, 401);
});

test('registration rejects short passwords and untrusted origins', async () => {
    const shortPassword = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email: 'short@example.com', password: 'short' })
    });
    assert.equal(shortPassword.status, 400);

    const untrustedOrigin = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email: 'unsafe@example.com', password: 'a-secure-password-123' })
    });
    assert.equal(untrustedOrigin.status, 403);

    const missingOrigin = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email: 'missing-origin@example.com', password: 'a-secure-password-123' })
    });
    assert.equal(missingOrigin.status, 403);
});

test('health endpoint verifies the database and returns security headers', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');

    const homepage = await fetch(`${baseUrl}/`);
    assert.equal(homepage.status, 200);
    assert.match(await homepage.text(), /Nossos Cursos em Destaque/);
    const loginPage = await fetch(`${baseUrl}/login.html`);
    assert.equal(loginPage.status, 200);
    assert.match(await loginPage.text(), /id="loginForm"/);
});

test('password reset reports the missing SMTP configuration instead of fake success', async () => {
    const response = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'person@example.com' })
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /ainda não está configurada/i);
});

test('checkout never grants course access without a configured payment provider', async () => {
    const registration = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Checkout Test',
            email: 'checkout@example.com',
            password: 'another-secure-password'
        })
    });
    const cookie = registration.headers.get('set-cookie').split(';')[0];
    const checkout = await fetch(`${baseUrl}/api/checkout`, {
        method: 'POST',
        headers: { Origin: 'http://localhost', Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: 'guia-financeiro' })
    });
    assert.equal(checkout.status, 503);
    assert.equal((await checkout.json()).code, 'STRIPE_NOT_CONFIGURED');
});

test('Stripe webhook signature is checked against the raw request body', async () => {
    const received = [];
    const mockStripe = {
        webhooks: {
            constructEvent(body, signature, secret) {
                received.push({ body, signature, secret });
                if (signature !== 'test-signature') throw new Error('bad signature');
                return {
                    id: 'evt_unhandled_test',
                    type: 'customer.created',
                    livemode: false,
                    data: { object: {} }
                };
            }
        }
    };
    const stripeApp = createApp({
        pool,
        stripeClient: mockStripe,
        env: {
            NODE_ENV: 'test',
            FRONTEND_ORIGINS: 'http://localhost',
            STRIPE_MODE: 'test',
            STRIPE_WEBHOOK_SECRET: 'whsec_test'
        }
    });
    const stripeServer = stripeApp.listen(0);
    await new Promise((resolve) => stripeServer.once('listening', resolve));
    const stripeUrl = `http://127.0.0.1:${stripeServer.address().port}/api/payments/stripe/webhook`;
    try {
        const invalid = await fetch(stripeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 'bad-signature' },
            body: '{"id":"evt_bad"}'
        });
        assert.equal(invalid.status, 400);
        const valid = await fetch(stripeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 'test-signature' },
            body: '{"id":"evt_unhandled_test"}'
        });
        assert.equal(valid.status, 200);
        assert.deepEqual(await valid.json(), { received: true });
        assert.ok(Buffer.isBuffer(received[0].body));
        assert.equal(received[0].secret, 'whsec_test');
    } finally {
        await new Promise((resolve, reject) => {
            stripeServer.close((error) => error ? reject(error) : resolve());
        });
    }
});
