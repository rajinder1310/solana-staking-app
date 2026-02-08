
import { TransactionModel, ITransaction } from '../models/transaction';
import { logger } from '../../utils/logger';

export class TransactionRepository {
  /**
   * Bulk insert transactions with duplicate handling
   */
  async saveBatch(transactions: Partial<ITransaction>[]) {
    if (transactions.length === 0) return;

    try {
      const result = await TransactionModel.insertMany(transactions, { ordered: false });
      logger.debug(`Saved ${result.length} transactions`);
      return result.length;
    } catch (error: any) {
      // Handle duplicate key errors (code 11000)
      if (error.writeErrors) {
        const duplicates = error.writeErrors.filter(
          (e: any) => e.code === 11000 || e?.err?.code === 11000
        ).length;

        const successCount = error.insertedDocs.length; // Approximate
        if (duplicates > 0) {
          logger.debug(`Skipped ${duplicates} duplicate transactions`);
        }

        return successCount;
      } else {
        throw error;
      }
    }
  }

  /**
   * Get the last indexed slot for a program
   */
  async getLastIndexedSlot(programId: string): Promise<number | null> {
    try {
      const tx = await TransactionModel.findOne({ programId })
        .sort({ slot: -1 })
        .select('slot');

      return tx ? tx.slot : null;
    } catch (error) {
      logger.error(`Failed to get last indexed slot for ${programId}: ${error}`);
      return null;
    }
  }

  /**
   * Check if specific signatures already exist
   */
  async filterExistingSignatures(programId: string, signatures: string[]): Promise<string[]> {
    const existing = await TransactionModel.find({
      programId,
      signature: { $in: signatures }
    }).select('signature');

    const existingSet = new Set(existing.map(tx => tx.signature));
    return signatures.filter(sig => !existingSet.has(sig));
  }
}
