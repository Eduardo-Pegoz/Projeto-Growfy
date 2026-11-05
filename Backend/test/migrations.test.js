const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runMigrations } = require('../src/db/migrate');

test('migrations acquire a database lock and record immutable checksums', async () => {
    const applied = [];
    const calls = [];
    const client = {
        async query(sql, values = []) {
            calls.push(sql);
            if (sql.includes('SELECT checksum FROM schema_migrations')) {
                const found = applied.find((entry) => entry.version === values[0]);
                return { rows: found ? [{ checksum: found.checksum }] : [], rowCount: found ? 1 : 0 };
            }
            if (sql.includes('INSERT INTO schema_migrations')) {
                applied.push({ version: values[0], checksum: values[1] });
            }
            return { rows: [], rowCount: 0 };
        },
        release() {
            calls.push('release');
        }
    };
    const pool = { async connect() { return client; } };

    await runMigrations(pool);
    assert.equal(applied.length, 2);
    assert.deepEqual(applied.map((entry) => entry.version), [
        '001_initial_schema.sql',
        '002_stripe_checkout.sql'
    ]);
    assert.ok(applied.every((entry) => /^[a-f0-9]{64}$/.test(entry.checksum)));
    assert.ok(calls.some((sql) => sql.includes('pg_advisory_lock')));
    assert.ok(calls.some((sql) => sql === 'COMMIT'));
    assert.equal(calls.at(-1), 'release');

    const firstApplicationCount = calls.filter((sql) => sql === 'BEGIN').length;
    calls.length = 0;
    await runMigrations(pool);
    assert.equal(calls.filter((sql) => sql === 'BEGIN').length, 0);
    assert.equal(firstApplicationCount, 2);
});
