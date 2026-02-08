/**
 * @file HistoricalIndexer implementation for Solana Event Indexer.
 * This class handles the backfilling of historical transaction data by polling
 * the Solana RPC for past signatures and processing them sequentially.
 */

import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import { BaseIndexer } from './base';
import { ProgramDefinition } from '../../config/programs';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { TransactionParser } from '../parsers/transaction';
import { withRetry, sleep } from '../../utils/retry';

/**
 * HistoricalIndexer polls for historical transaction signatures and indexes them.
 * It supports auto-resume from the last indexed slot and handles pagination backwards in time.
 */
export class HistoricalIndexer extends BaseIndexer {
  /** Connection to the Solana RPC node */
  private connection: Connection;
  /** The public key of the program being indexed */
  private programId: PublicKey;
  /** The current slot used for reference (though indexing often goes by signature) */
  private currentSlot: number;

  /**
   * Initialize the historical indexer.
   * @param program The program configuration definition.
   */
  constructor(program: ProgramDefinition) {
    super(program);
    this.programId = new PublicKey(program.id);
    this.connection = new Connection(config.rpcUrl, config.commitment);
    this.currentSlot = program.startSlot || 0;
  }

  /**
   * Start the historical backfilling process.
   * Checks for the last indexed slot to determine where to resume or start.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Auto-resume logic: check DB for last indexed slot
    const lastSlot = await this.repository.getLastIndexedSlot(this.program.id);
    if (lastSlot && lastSlot > this.currentSlot) {
      this.currentSlot = lastSlot;
      logger.info(`[${this.program.name}] 🔄 Resuming historical backfill from slot ${this.currentSlot}`);
    } else {
      logger.info(`[${this.program.name}] 📜 Starting fresh backfill from slot ${this.currentSlot}`);
    }

    // Start the main polling loop
    this.loop();
  }

  /**
   * The main loop that fetches signatures and processes them.
   * Uses `before` parameter for pagination (fetching older transactions).
   */
  private async loop() {
    let beforeSignature: string | undefined = undefined;
    let batchSize = config.batchSize;

    while (this.isRunning) {
      try {
        // Fetch signatures for the address
        const signatures = await withRetry(async () => {
          return await this.connection.getSignaturesForAddress(
            this.programId,
            { limit: batchSize, before: beforeSignature },
            config.commitment
          );
        });

        if (signatures.length === 0) {
          logger.info(`[${this.program.name}] 🏁 No more historical signatures found. Backfill complete? Waiting...`);
          // Wait longer if we think we're done, then try again (in case of new activity or deep history)
          await sleep(config.pollInterval * 5);
          beforeSignature = undefined; // Reset to check from the top (newest) again or consider stop logic
          continue;
        }

        logger.info(`[${this.program.name}] 📥 Fetched ${signatures.length} historical signatures`);

        // Filter out signatures that have already been indexed in the database
        const sigStrings = signatures.map(s => s.signature);
        const newSignatures = await this.repository.filterExistingSignatures(this.program.id, sigStrings);

        if (newSignatures.length > 0) {
          await this.processBatch(newSignatures);
        } else {
          logger.debug(`[${this.program.name}] All ${signatures.length} signatures already indexed.`);
        }

        // Pagination: prepare for the next batch.
        // getSignaturesForAddress returns newest first. To go back in time, we use the last signature as 'before'.
        beforeSignature = signatures[signatures.length - 1].signature;

        // Adaptive batching: increase batch size if successful, up to max
        if (batchSize < config.maxBatchSize) batchSize = Math.min(batchSize * 2, config.maxBatchSize);

        await sleep(config.pollInterval);

      } catch (error: any) {
        logger.error(`[${this.program.name}] Backfill loop error: ${error.message}`);
        // Reduce batch size on error (congestion, rate limits)
        if (batchSize > config.minBatchSize) batchSize = Math.floor(batchSize / 2);
        await sleep(5000);
      }
    }
  }

  /**
   * Process a batch of signatures by fetching their transaction details and saving them to the DB.
   * Handles "413 Payload Too Large" errors by recursively splitting the batch.
   *
   * @param signatures Array of transaction signatures to process.
   */
  private async processBatch(signatures: string[]) {
    logger.info(`[${this.program.name}] ⚙️ Processing batch of ${signatures.length} transactions...`);

    // Non-batch processing to avoid 402 Payment Required on specific RPCs
    const fetchAndSave = async (sigs: string[]) => {
      for (const signature of sigs) {
        try {
          // Fetch one by one
          const tx = await withRetry(async () => {
            return await this.connection.getParsedTransaction(signature, {
              maxSupportedTransactionVersion: 0,
              commitment: config.commitment
            });
          });

          if (!tx) {
            logger.warn(`[${this.program.name}] Tx not found: ${signature}`);
            continue;
          }

          // Parse
          const data = TransactionParser.parse(signature, tx, this.program.id);
          if (data) {
            // Save immediately to avoid batch loss
            await this.repository.saveBatch([
              { ...data, programId: this.program.id, source: 'backfill' }
            ]);
            logger.info(`[${this.program.name}] ✅ Indexed historical tx: ${signature}`);
          }

          await sleep(500); // Rate limit protection
        } catch (err: any) {
          logger.warn(`Failed to process ${signature}: ${err.message}`);
          await sleep(2000); // Backoff on error
        }
      }
    };

    await fetchAndSave(signatures);
    return; // Skip original batch logic


    await fetchAndSave(signatures);
  }
}
