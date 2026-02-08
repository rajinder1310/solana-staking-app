
import { connectDatabase, closeDatabase } from './db/connection';
import { IndexerService } from './services/indexer.service';
import { logger } from './utils/logger';
import express from 'express';
import cors from 'cors';
import { TransactionModel } from './models/Transaction';

async function main() {
  try {
    // 1. Initialize Database
    await connectDatabase();

    // 2. Start Indexer Service
    const indexerService = new IndexerService();
    await indexerService.start();

    // 3. Start Express API Server
    const app = express();
    app.use(cors());
    app.use(express.json());

    const PORT = process.env.API_PORT || 3001;

    // History Endpoint
    app.get('/history', async (req, res) => {
      try {
        const address = req.query.address as string;
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '10');
        const skip = (page - 1) * limit;

        if (!address) {
          return res.status(400).json({ error: 'Address is required' });
        }

        // Query transactions where any event has the matching staker
        const query = { 'events.staker': address };

        const total = await TransactionModel.countDocuments(query);

        const transactions = await TransactionModel.find(query)
          .sort({ blockTime: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // Flatten events for the frontend
        // Note: A single transaction might have multiple events, but usually we just want to list the relevant ones.
        // For simplicity, we can return the transaction structure and the frontend can parse, OR we flatten here.
        // Let's return the transactions but we might need to map them to the format the frontend expects:
        // { signature, blockTime, type, amount, status }

        const flattenedHistory = transactions.flatMap(tx => {
          // Filter events in this tx that match the user (if multiple stakers in one tx - rare but possible)
          return (tx as any).events
            .filter((e: any) => e.staker === address)
            .map((e: any) => ({
              signature: tx.signature,
              blockTime: tx.blockTime,
              type: e.type,
              amount: e.amount,
              status: tx.err ? 'Failed' : 'Success'
            }));
        });

        // Pagination metadata based on TRANSACTIONS, but we returned flattened events.
        // Since one tx usually = one event, this is roughly correct.

        return res.json({
          success: true,
          data: flattenedHistory,
          pagination: {
            total, // approximate, assumes 1 event per tx
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        });

      } catch (error) {
        logger.error(`API Error: ${error}`);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    app.listen(PORT, () => {
      logger.info(`🚀 API Server running on port ${PORT}`);
    });

    // 4. Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\nReceived ${signal}. Shutting down...`);
      indexerService.stop();
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error(`Application failed to start: ${error}`);
    process.exit(1);
  }
}

main();
