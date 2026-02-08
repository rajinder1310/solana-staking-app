
import { TransactionModel, ITransaction } from '../models/Transaction';
import { StakingEventModel, IStakingEvent } from '../models/StakingEvent';
import { logger } from '../utils/logger';

export class IndexerRepository {

  /**
   * Filter out signatures that already exist in the DB for this program.
   */
  async filterExistingSignatures(programId: string, signatures: string[]): Promise<string[]> {
    if (signatures.length === 0) return [];

    const existing = await TransactionModel.find({
      programId,
      signature: { $in: signatures }
    }).select('signature');

    const existingSet = new Set(existing.map(tx => tx.signature));
    return signatures.filter(s => !existingSet.has(s));
  }

  /**
   * Get the last indexed slot for a program to support auto-resume.
   */
  async getLastIndexedSlot(programId: string): Promise<number | null> {
    const lastTx = await TransactionModel.findOne({ programId }).sort({ slot: -1 });
    return lastTx ? lastTx.slot : null;
  }

  /**
   * Save a batch of parsed transactions and their events.
   */
  async saveBatch(parsedDataList: any[]): Promise<void> {
    if (parsedDataList.length === 0) return;

    const session = await TransactionModel.startSession();
    session.startTransaction();

    try {
      const txOps = parsedDataList.map(data => ({
        updateOne: {
          filter: { signature: data.signature },
          update: { $setOnInsert: data }, // Only insert if missing
          upsert: true
        }
      }));

      const eventOps = [];
      for (const data of parsedDataList) {
        if (data.events && data.events.length > 0) {
          for (const event of data.events) {
            eventOps.push({
              updateOne: {
                filter: { signature: event.signature, type: event.type, logIndex: event.logIndex }, // Ensure uniqueness
                update: { $setOnInsert: event },
                upsert: true
              }
            });
          }
        }
      }

      if (txOps.length > 0) {
        await TransactionModel.bulkWrite(txOps);
      }

      if (eventOps.length > 0) {
        await StakingEventModel.bulkWrite(eventOps);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Repository Save Error: ${error}`);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
