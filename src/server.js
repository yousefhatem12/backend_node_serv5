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

    // Ensure candidate_profiles has required columns (full_name, avatar) in database
    await ensureCandidateProfileColumns();

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

async function ensureCandidateProfileColumns() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('candidate_profiles').catch(() => null);
    if (tableInfo) {
      if (!tableInfo.full_name) {
        await queryInterface.addColumn('candidate_profiles', 'full_name', {
          type: db.Sequelize.STRING(150),
          allowNull: true
        }).catch(() => {});
        logger.info('[Database] Added missing column "full_name" to candidate_profiles table.');
      }
      if (!tableInfo.avatar) {
        await queryInterface.addColumn('candidate_profiles', 'avatar', {
          type: db.Sequelize.STRING(255),
          allowNull: true
        }).catch(() => {});
        logger.info('[Database] Added missing column "avatar" to candidate_profiles table.');
      }
    }
  } catch (err) {
    logger.warn('[Database] Schema check notice: %s', err.message);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, ensureCandidateProfileColumns };
