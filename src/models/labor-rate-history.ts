import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { LaborRateHistoryInput } from './schemas/labor-rate';

export interface ILaborRateHistory extends Omit<LaborRateHistoryInput, 'laborRateId' | 'createdBy'>, Document {
  laborRateId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

const LaborRateHistorySchema: Schema = new Schema(
  {
    laborRateId: { type: Schema.Types.ObjectId, ref: 'LaborRate', required: true, index: true },
    hourlyRate: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

LaborRateHistorySchema.index({ laborRateId: 1, effectiveDate: -1 });

const LaborRateHistory: Model<ILaborRateHistory> =
  mongoose.models.LaborRateHistory || mongoose.model<ILaborRateHistory>('LaborRateHistory', LaborRateHistorySchema);

export default LaborRateHistory;
