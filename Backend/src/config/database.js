const { Pool } = require('pg');

function createPool(env = process.env) {
    const connectionString = env.DATABASE_URL;
    const ssl = env.PGSSL === 'true' ? { rejectUnauthorized: true } : false;

    if (connectionString) {
        return new Pool({ connectionString, ssl });
    }

    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
    }

    return new Pool({
        host: env.DB_HOST,
        port: Number(env.DB_PORT || 5432),
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        ssl,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });
}

module.exports = { createPool };
