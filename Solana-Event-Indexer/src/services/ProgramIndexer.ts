
import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedTransactionWithMeta } from '@solana/web3.js';
import { ProgramConfig } from '../types';
import { TransactionModel } from '../models/Transaction';

/**
 * ProgramIndexer - Indexes transactions for a specific Solana program
 *
 * Similar to EVM's ChainIndexer, this class handles:
 * - Fetching transaction signatures using getSignaturesForAddress
 * - Parsing and storing transaction details
 * - Auto-resume from last indexed slot
 * - Error handling and retries
 */
export class ProgramIndexer {
  private connection: Connection;
  private programId: PublicKey;
  private config: ProgramConfig;
  private isRunning: boolean = false;
  private currentSlot: number;

  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly POLL_INTERVAL = 10000; // 10 seconds
  private readonly COMMITMENT = 'confirmed'; // Avoid reorgs

  constructor(config: ProgramConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, this.COMMITMENT);
    this.programId = new PublicKey(config.programId);
    this.currentSlot = config.startSlot;
  }

  /**
   * Start the indexer
   */
  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Auto-resume logic: Check for last indexed slot in database
    const lastIndexedSlot = await this.getLastIndexedSlot();
    if (lastIndexedSlot && lastIndexedSlot > this.currentSlot) {
      this.currentSlot = lastIndexedSlot + 1;
      console.log(`[${this.config.name}] 🔄 Resuming from saved state: slot ${this.currentSlot}`);
    } else {
      console.log(`[${this.config.name}] 🆕 Starting fresh from config startSlot: ${this.currentSlot}`);
    }

    this.loop();
  }

  /**
   * Get the last indexed slot from database
   */
  private async getLastIndexedSlot(): Promise<number | null> {
    try {
      const latestTransaction = await TransactionModel.findOne({
        programId: this.config.programId
      }).sort({ slot: -1 });

      return latestTransaction ? latestTransaction.slot : null;
    } catch (error) {
      console.error(`[${this.config.name}] ❌ Failed to fetch last indexed slot:`, error);
      return null;
    }
  }

  /**
   * Main indexing loop
   * Continuously fetches signatures and processes transactions
   */
  private async loop() {
    let currentBatchSize = this.config.maxSignaturesPerRequest || 100;

    while (this.isRunning) {
      try {
        // Fetch signatures for the program address
        console.log(`[${this.config.name}] 🔍 Fetching signatures (batch size: ${currentBatchSize})...`);

        const signatures = await this.connection.getSignaturesForAddress(
          this.programId,
          { limit: currentBatchSize },
          this.COMMITMENT
        );

        if (signatures.length === 0) {
          console.log(`[${this.config.name}] ⏳ No new signatures. Waiting ${this.POLL_INTERVAL}ms...`);
          await this.sleep(this.POLL_INTERVAL);
          continue;
        }

        console.log(`[${this.config.name}] 📥 Found ${signatures.length} signatures. Fetching transaction details...`);

        // Fetch and save transaction details
        await this.fetchAndSaveTransactions(signatures);

        // Adaptive batching: Increase batch size on success
        if (currentBatchSize < 1000) {
          currentBatchSize = Math.min(currentBatchSize * 2, 1000);
        }

        // Small delay before next batch
        await this.sleep(1000);

      } catch (error: any) {
        console.error(`[${this.config.name}] ❌ Error in loop:`, error.message);

        // Adaptive batching: Reduce batch size on error
        if (currentBatchSize > 50) {
          currentBatchSize = Math.floor(currentBatchSize / 2);
          console.log(`[${this.config.name}] ⚠️  Reduced batch size to ${currentBatchSize} due to error.`);
        }

        console.log(`[${this.config.name}] 🔄 Retrying in ${this.RETRY_DELAY}ms...`);
        await this.sleep(this.RETRY_DELAY);
      }
    }
  }

  /**
   * Fetch full transaction details and save to database
   */
  private async fetchAndSaveTransactions(signatures: ConfirmedSignatureInfo[]) {
    const transactionsToSave = [];

    for (const sigInfo of signatures) {
      try {
        // Fetch full transaction details
        const transaction = await this.connection.getParsedTransaction(
          sigInfo.signature,
          {
            maxSupportedTransactionVersion: 0,
            commitment: this.COMMITMENT
          }
        );

        if (!transaction) {
          console.warn(`[${this.config.name}] ⚠️  Transaction ${sigInfo.signature} not found, skipping...`);
          continue;
        }

        // Extract relevant data
        transactionsToSave.push({
          programId: this.config.programId,
          signature: sigInfo.signature,
          slot: sigInfo.slot,
          blockTime: sigInfo.blockTime,
          instructions: this.extractInstructions(transaction),
          logs: transaction.meta?.logMessages || null,
          createdAt: new Date()
        });

      } catch (error: any) {
        console.error(`[${this.config.name}] ❌ Failed to fetch transaction ${sigInfo.signature}:`, error.message);
        // Continue with next transaction
      }
    }

    // Save to database
    if (transactionsToSave.length > 0) {
      await this.saveTransactions(transactionsToSave);
    }
  }

  /**
   * Extract instructions from parsed transaction
   */
  private extractInstructions(transaction: ParsedTransactionWithMeta): any[] {
    const instructions = [];

    if (transaction.transaction.message.instructions) {
      for (const instruction of transaction.transaction.message.instructions) {
        instructions.push({
          programId: instruction.programId.toString(),
          data: 'data' in instruction ? instruction.data : null,
          parsed: 'parsed' in instruction ? instruction.parsed : null
        });
      }
    }

    return instructions;
  }

  /**
   * Save transactions to MongoDB with duplicate handling
   */
  private async saveTransactions(transactions: any[]) {
    if (transactions.length === 0) return;

    console.log(`[${this.config.name}] 💾 Saving ${transactions.length} transactions...`);

    try {
      await TransactionModel.insertMany(transactions, { ordered: false });
      console.log(`[${this.config.name}] ✅ Successfully saved ${transactions.length} transactions.`);
    } catch (error: any) {
      // Handle duplicate key errors
      if (error.writeErrors) {
        const duplicates = error.writeErrors.filter(
          (e: any) => e.code === 11000 || e?.err?.code === 11000
        ).length;

        if (duplicates > 0) {
          console.log(`[${this.config.name}] ⏭️  Skipped ${duplicates} duplicate transactions.`);
        }

        if (error.writeErrors.length > duplicates) {
          throw error; // Re-throw if there are non-duplicate errors
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop the indexer
   */
  public stop() {
    this.isRunning = false;
    console.log(`[${this.config.name}] 🛑 Stopping indexer...`);
  }
}
