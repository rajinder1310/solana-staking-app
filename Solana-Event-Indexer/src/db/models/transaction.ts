
import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  programId: string;
  signature: string;
  slot: number;
  blockTime: number | null;
  instructions: any[];
  logs: string[] | null;
  source: 'realtime' | 'backfill';
  indexedAt: Date;
  createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
  programId: { type: String, required: true, index: true },
  signature: { type: String, required: true },
  slot: { type: Number, required: true },
  blockTime: { type: Number, required: false },
  instructions: { type: Schema.Types.Mixed, required: true },
  logs: { type: [String], required: false },
  source: { type: String, enum: ['realtime', 'backfill'], default: 'realtime' },
  indexedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Compound unique index to prevent duplicate transactions
TransactionSchema.index({ programId: 1, signature: 1 }, { unique: true });

// Efficient querying for resume functionality
TransactionSchema.index({ programId: 1, slot: -1 });

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
