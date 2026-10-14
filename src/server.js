const app = require('./app');
const config = require('./config/env');
const db = require('./models');
const logger = require('./utils/logger');
const worker = require('./jobs/worker');
const scheduler = require('./jobs/scheduler');

async function startServer() {
  try {
    // Authenticate database connection
    await db.sequelize.authenticate();
    logger.info(`[Database] Connected successfully to MySQL (${config.db.name} at ${config.db.host}:${config.db.port})`);

    // Start background queue worker
    worker.start(2000);

    // Initialize cron jobs
    scheduler.init();

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`[Server] ${config.appName} listening on port ${config.port} (${config.env})`);
      logger.info(`[Server] Health check available at: ${config.appUrl}/api/health`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`[Server] Received ${signal}. Shutting down gracefully...`);
      worker.stop();
      scheduler.stop();
      server.close(async () => {
        try {
          await db.sequelize.close();
          logger.info('[Database] Connection closed.');
          process.exit(0);
        } catch (err) {
          logger.error('[Server] Error during shutdown: %s', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    logger.error('[Server] Failed to start application: %s', err.stack || err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
