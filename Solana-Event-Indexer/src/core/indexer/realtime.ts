/**
 * @file RealtimeIndexer implementation for Solana Event Indexer.
 * This class establishes a WebSocket connection to listen for logs related to a
 * specific program and processes transactions in real‑time.
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { BaseIndexer } from './base';
import { ProgramDefinition } from '../../config/programs';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { TransactionParser } from '../parsers/transaction';
import { withRetry, sleep } from '../../utils/retry';

/**
 * RealtimeIndexer subscribes to Solana logs via WebSocket and indexes
 * transactions as they occur.
 */
export class RealtimeIndexer extends BaseIndexer {
  /** Solana RPC connection */
  private connection: Connection;
  /** Subscription ID returned by `onLogs` */
  private wsSubscriptionId: number | null = null;
  /** PublicKey of the program being indexed */
  private programId: PublicKey;

  /**
   * Initialise the indexer for a given program definition.
   * @param program Program configuration containing ID and indexing flags.
   */
  constructor(program: ProgramDefinition) {
    super(program);
    this.programId = new PublicKey(program.id);
    this.connection = new Connection(config.rpcUrl, {
      wsEndpoint: config.wsUrl,
      commitment: config.commitment
    });
  }

  /**
   * Start the realtime indexing process. Sets up the WebSocket subscription.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info(`[${this.program.name}] 🟢 Starting Realtime Indexer (WebSocket)`);
    this.subscribeToLogs();
  }

  /**
   * Subscribe to logs for the program using the `mentions` filter.
   * Handles reconnection logic and unsupported filter errors.
   */
  private async subscribeToLogs() {
    try {
      // Use 'mentions' filter to capture any transaction involving this address
      // This works for Programs (execution), Mints (transfers), and Wallets
      this.wsSubscriptionId = this.connection.onLogs(
        this.programId,
        async (logs, ctx) => {
          if (!this.isRunning) return;

          // Signature of the transaction that emitted the log
          const signature = logs.signature;

          try {
            // Fetch full details
            await this.processTransaction(signature);
          } catch (error) {
            logger.error(`[${this.program.name}] Failed to process realtime tx ${signature}: ${error}`);
          }
        },
        config.commitment
      );

      logger.info(`[${this.program.name}] Subscribed to logs. Subscription ID: ${this.wsSubscriptionId}`);
    } catch (error: any) {
      // Check for fatal errors (like Invalid Request -32602 which implies mentions not supported)
      if (error?.message?.includes('Invalid mentions') || error?.code === -32602) {
        logger.error(`[${this.program.name}] ⚠️ WebSocket 'mentions' filter not supported by RPC. Disabling Realtime mode and relying on Historical poller.`);
        this.stop(); // Stop this indexer functionality
        return;
      }

      logger.error(`[${this.program.name}] WebSocket subscription failed: ${error}`);
      await sleep(config.wsReconnectDelay);
      if (this.isRunning) this.subscribeToLogs();
    }
  }

  /**
   * Process a single transaction identified by its signature.
   * @param signature Transaction signature to fetch and index.
   */
  private async processTransaction(signature: string) {
    // Check if we already have it (debounce)
    const exists = await this.repository.filterExistingSignatures(this.program.id, [signature]);
    if (exists.length === 0) return;

    logger.debug(`[${this.program.name}] ⚡ Detected realtime transaction: ${signature}`);

    const tx = await withRetry(async () => {
      return await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: config.commitment
      });
    });

    if (!tx) {
      logger.warn(`[${this.program.name}] Transaction not found: ${signature}`);
      return;
    }

    const parsedData = TransactionParser.parse(signature, tx, this.program.id);

    if (!parsedData) {
      // logger.debug(`[${this.program.name}] Skipped non-program interaction: ${signature}`);
      return;
    }

    await this.repository.saveBatch([
      {
        ...parsedData,
        programId: this.program.id,
        source: 'realtime'
      }
    ]);

    logger.info(`[${this.program.name}] ✅ Indexed realtime tx: ${signature} (Slot: ${parsedData.slot})`);
  }

  /**
   * Stop the realtime indexer and clean up the WebSocket subscription.
   */
  stop(): void {
    super.stop();
    if (this.wsSubscriptionId !== null) {
      this.connection.removeOnLogsListener(this.wsSubscriptionId)
        .catch(err => logger.error(`Failed to remove listener: ${err}`));
      this.wsSubscriptionId = null;
    }
  }
}
