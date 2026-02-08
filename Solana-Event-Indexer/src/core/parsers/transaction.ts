
import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import * as borsh from 'borsh'; // We only might need this if we used structs, but for simple events we can use Buffer directly
import { logger } from '../../utils/logger';

// Hardcoded Discriminators (Observed from on-chain logs)
const DISCRIMINATORS = {
  // Standard Anchor Discriminators (sha256("event:Name").slice(0, 8))
  TokensStaked: Buffer.from('dc82918e6d7b2664', 'hex'),
  TokensWithdrawn: Buffer.from('1e746e935759099e', 'hex'),
  FeeUpdated: Buffer.from('e44b2b6709c4b604', 'hex')
};

export class TransactionParser {

  /**
   * Parse a transaction to extract metadata and events.
   */
  static parse(signature: string, tx: ParsedTransactionWithMeta, programId: string) {
    // logger.debug(`[Parser] processing ${signature} for ${programId}`);
    const slot = tx.slot;
    const blockTime = tx.blockTime || Math.floor(Date.now() / 1000);
    const err = tx.meta?.err || null;
    const logs = tx.meta?.logMessages || [];

    // FILTER CHECK: Ensure the transaction actually uses the program as an instruction
    const isProgramInteraction = tx.transaction.message.instructions.some((ix: any) => ix.programId.toString() === programId) ||
      tx.meta?.innerInstructions?.some((inner: any) => inner.instructions.some((ix: any) => ix.programId.toString() === programId));

    if (!isProgramInteraction) {
      if (Math.random() < 0.05) { // Log 5% of skips to avoid spam but catch samples
        const ixs = tx.transaction.message.instructions.map((ix: any) => ix.programId.toString());
        logger.debug(`[Filter] Skipping ${signature}. Ixs: [${ixs.join(', ')}] != ${programId}`);
      }
      return null;
    }

    const parsedData: any = {
      signature,
      slot,
      blockTime,
      err,
      logs,
      events: []
    };

    if (logs.length > 0 && !err) {
      try {
        for (const log of logs) {
          if (log.startsWith('Program data: ')) {
            const base64Data = log.replace('Program data: ', '');
            const buffer = Buffer.from(base64Data, 'base64');
            // logger.info(`[Parser] ${signature} found data: ${buffer.slice(0, 8).toString('hex')}`); // DEBUG ONE LINE
            const eventData = this.decodeEvent(buffer, signature, slot, blockTime, programId);
            if (eventData) {
              logger.info(`✅ MATCHED EVENT: ${eventData.type} in ${signature}`);
              parsedData.events.push(eventData);
            }
          }
        }
      } catch (e: any) {
        logger.warn(`Manual parsing warning for ${signature}: ${e.message}`);
      }
    }

    return parsedData;
  }

  /**
   * Decode generic event data from buffer based on discriminator.
   */
  private static decodeEvent(buffer: Buffer, signature: string, slot: number, blockTime: number, programId: string) {
    if (buffer.length < 8) return null;

    const discriminator = buffer.slice(0, 8);
    // logger.info(`Checking disc: ${discriminator.toString('hex')}`);

    let type = '';
    const data: any = {};
    let offset = 8;

    if (discriminator.equals(DISCRIMINATORS.TokensStaked)) {
      type = 'deposit';
      // [staker: 32] [amount: 8] [totalStaked: 8]
      data.staker = new PublicKey(buffer.slice(offset, offset + 32)).toString(); offset += 32;
      data.amount = buffer.readBigUInt64LE(offset).toString(); offset += 8;
      data.totalStaked = buffer.readBigUInt64LE(offset).toString(); offset += 8;

    } else if (discriminator.equals(DISCRIMINATORS.TokensWithdrawn)) {
      type = 'withdraw';
      // [staker: 32] [amount: 8] [fee: 8] [totalStaked: 8]
      data.staker = new PublicKey(buffer.slice(offset, offset + 32)).toString(); offset += 32;
      data.amount = buffer.readBigUInt64LE(offset).toString(); offset += 8;
      data.fee = buffer.readBigUInt64LE(offset).toString(); offset += 8;
      data.totalStaked = buffer.readBigUInt64LE(offset).toString(); offset += 8;

    } else if (discriminator.equals(DISCRIMINATORS.FeeUpdated)) {
      type = 'fee_update';
      // [oldFee: 8] [newFee: 8]
      data.oldFee = buffer.readBigUInt64LE(offset).toString(); offset += 8;
      data.newFee = buffer.readBigUInt64LE(offset).toString(); offset += 8;

    } else {
      return null;
    }

    return {
      signature,
      slot,
      blockTime,
      programId,
      type,
      ...data
    };
  }
}
