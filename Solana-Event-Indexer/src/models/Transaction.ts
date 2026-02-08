
import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  signature: string;
  slot: number;
  blockTime: number;
  programId: string;
  err: any;
  logs: string[];
  instructions?: any[];
  source: 'realtime' | 'backfill';
}

const TransactionSchema: Schema = new Schema({
  signature: { type: String, required: true, unique: true, index: true },
  slot: { type: Number, required: true, index: true },
  blockTime: { type: Number, required: true, index: true },
  programId: { type: String, required: true, index: true },
  err: { type: Schema.Types.Mixed, default: null },
  logs: { type: [String], default: [] },
  instructions: { type: [Schema.Types.Mixed], default: [] },
  events: { type: [Schema.Types.Mixed], default: [] }, // Added to store parsed events
  source: { type: String, enum: ['realtime', 'backfill'], default: 'backfill' }
}, { timestamps: true });

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
