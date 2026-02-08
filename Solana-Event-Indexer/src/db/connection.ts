
import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('🚀 MongoDB Connected successfully');
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${error}`);
    process.exit(1);
  }
};

export const closeDatabase = async () => {
  await mongoose.connection.close();
  logger.info('👋 MongoDB Connection Closed');
};
