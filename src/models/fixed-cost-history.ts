import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { FixedCostHistoryInput } from './schemas/fixed-cost';

export interface IFixedCostHistory extends Omit<FixedCostHistoryInput, 'fixedCostId' | 'createdBy'>, Document {
  fixedCostId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

const FixedCostHistorySchema: Schema = new Schema(
  {
    fixedCostId: { type: Schema.Types.ObjectId, ref: 'FixedCost', required: true, index: true },
    monthlyAmount: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

FixedCostHistorySchema.index({ fixedCostId: 1, effectiveDate: -1 });

const FixedCostHistory: Model<IFixedCostHistory> =
  mongoose.models.FixedCostHistory || mongoose.model<IFixedCostHistory>('FixedCostHistory', FixedCostHistorySchema);

export default FixedCostHistory;
