const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createPool } = require('./src/config/database');
const { runMigrations } = require('./src/db/migrate');
const appModule = require('./src/app');

async function start() {
    const pool = createPool();
    try {
        await runMigrations(pool);
        const app = appModule.createApp({ pool });
        const port = Number(process.env.PORT || 3000);
        const server = app.listen(port, () => {
            console.log(`Growfy server listening on port ${port}`);
        });

        let isShuttingDown = false;
        const shutdown = () => {
            if (isShuttingDown) return;
            isShuttingDown = true;
            server.close((error) => {
                pool.end().then(() => {
                    if (error) {
                        console.error('Error while closing HTTP server:', error.message);
                        process.exitCode = 1;
                    }
                }).catch((poolError) => {
                    console.error('Error while closing database pool:', poolError.message);
                    process.exitCode = 1;
                });
            });
        };
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    } catch (error) {
        await pool.end();
        throw error;
    }
}

if (require.main === module) {
    start().catch((error) => {
        console.error('Unable to start Growfy:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { ...appModule, start };
