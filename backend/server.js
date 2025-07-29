// Server entry point 
const app = require('./src/app');
const { databaseConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
const { createIndexes } = require('./src/config/indexes');

const PORT = process.env.PORT || 3001;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await databaseConnection.connect();
    logger.info('✅ Database connected successfully');
    
    // Create database indexes - temporarily disabled due to data issues
    // await createIndexes();
    // logger.info('✅ Database indexes created successfully');
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Backend API available at http://localhost:${PORT}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`\n=== INSURANCE MASTERS BACKEND ===`);
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log(`API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`================================\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      server.close(() => {
        logger.info('Process terminated');
      });
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer(); 