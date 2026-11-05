const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createPool } = require('../src/config/database');
const { runMigrations } = require('../src/db/migrate');

async function main() {
    const pool = createPool();
    try {
        await runMigrations(pool);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('Database migrations failed:', error.message);
    process.exitCode = 1;
});
