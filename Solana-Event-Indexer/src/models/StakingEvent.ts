
import mongoose, { Schema, Document } from 'mongoose';

export interface IStakingEvent extends Document {
  signature: string;
  blockTime: number;
  slot: number;
  blockNumber: number; // Same as slot (Solana's block identifier)
  programId: string;
  type: 'deposit' | 'withdraw' | 'fee_update' | 'unknown';
  logIndex?: number; // Optional log index within transaction

  // Parsed Data
  staker?: string;
  amount?: string;
  fee?: string;
  totalStaked?: string;
  oldFee?: string;
  newFee?: string;
}

const StakingEventSchema: Schema = new Schema({
  signature: { type: String, required: true, index: true },
  blockTime: { type: Number, required: true },
  slot: { type: Number, required: true, index: true },
  blockNumber: { type: Number, required: true, index: true }, // Same as slot
  programId: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true },
  logIndex: { type: Number }, // Optional log index

  staker: { type: String },
  amount: { type: String },
  fee: { type: String },
  totalStaked: { type: String },
  oldFee: { type: String },
  newFee: { type: String },
}, { timestamps: true });

// Composite index for fast lookups
StakingEventSchema.index({ programId: 1, type: 1, slot: -1 });

export const StakingEventModel = mongoose.model<IStakingEvent>('StakingEvent', StakingEventSchema);
