
import dotenv from 'dotenv';
import { programs } from './programs';

dotenv.config();

export const config = {
  // MongoDB
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/solana_indexer',

  // Solana
  rpcUrl: process.env.RPC_URL || 'https://api.devnet.solana.com',
  wsUrl: process.env.WS_URL || 'wss://api.devnet.solana.com',
  commitment: 'confirmed' as const,

  // Indexer Settings
  batchSize: 25,     // Reduced to avoid 413 Payload Too Large
  maxBatchSize: 50,  // Capped for GetBlock limits
  minBatchSize: 1,
  pollInterval: 1000,
  wsReconnectDelay: 5000,

  // Programs to index
  programs
};
