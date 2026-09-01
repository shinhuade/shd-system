import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { UtilityRateHistoryInput } from './schemas/utility-rate';

export interface IUtilityRateHistory
  extends Omit<UtilityRateHistoryInput, 'utilityRateId' | 'createdBy'>,
    Document {
  utilityRateId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

const UtilityRateHistorySchema: Schema = new Schema(
  {
    utilityRateId: { type: Schema.Types.ObjectId, ref: 'UtilityRate', required: true, index: true },
    unitPrice: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

UtilityRateHistorySchema.index({ utilityRateId: 1, effectiveDate: -1 });

const UtilityRateHistory: Model<IUtilityRateHistory> =
  mongoose.models.UtilityRateHistory ||
  mongoose.model<IUtilityRateHistory>('UtilityRateHistory', UtilityRateHistorySchema);

export default UtilityRateHistory;
