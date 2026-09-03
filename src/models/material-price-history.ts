import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { MaterialPriceHistoryInput } from './schemas/material';

export interface IMaterialPriceHistory extends Omit<MaterialPriceHistoryInput, 'materialId' | 'createdBy'>, Document {
  materialId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

const MaterialPriceHistorySchema: Schema = new Schema(
  {
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
    pricePerKg: { type: Number, required: true },
    lossRatePercent: { type: Number, default: null },
    effectiveDate: { type: Date, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

MaterialPriceHistorySchema.index({ materialId: 1, effectiveDate: -1 });

const MaterialPriceHistory: Model<IMaterialPriceHistory> =
  mongoose.models.MaterialPriceHistory ||
  mongoose.model<IMaterialPriceHistory>('MaterialPriceHistory', MaterialPriceHistorySchema);

export default MaterialPriceHistory;
