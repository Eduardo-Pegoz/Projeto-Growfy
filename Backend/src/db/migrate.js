const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATION_LOCK_ID = 721945821;

async function runMigrations(pool) {
    const client = await pool.connect();
    try {
        await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                checksum CHAR(64) NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const files = (await fs.readdir(MIGRATIONS_DIR))
            .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/.test(name))
            .sort();

        for (const filename of files) {
            const sql = await fs.readFile(path.join(MIGRATIONS_DIR, filename), 'utf8');
            const checksum = crypto.createHash('sha256').update(sql).digest('hex');
            const existing = await client.query(
                'SELECT checksum FROM schema_migrations WHERE version = $1',
                [filename]
            );
            if (existing.rowCount > 0) {
                if (existing.rows[0].checksum !== checksum) {
                    throw new Error(`Applied migration was modified: ${filename}`);
                }
                continue;
            }

            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
                    [filename, checksum]
                );
                await client.query('COMMIT');
                console.log(`Applied database migration ${filename}`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }
    } finally {
        try {
            await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
        } finally {
            client.release();
        }
    }
}

module.exports = { runMigrations };
