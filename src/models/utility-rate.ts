import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { UtilityRateInput, UTILITY_TYPES } from './schemas/utility-rate';

export interface IUtilityRate extends UtilityRateInput, Document {}

const UtilityRateSchema: Schema = new Schema(
  {
    type: { type: String, enum: UTILITY_TYPES, required: true, unique: true },
    unitLabel: { type: String, required: true },
    currentUnitPrice: { type: Number, default: 0 },
    lastEffectiveDate: { type: Date },
  },
  commonOptions,
);

const UtilityRate: Model<IUtilityRate> =
  mongoose.models.UtilityRate || mongoose.model<IUtilityRate>('UtilityRate', UtilityRateSchema);

export default UtilityRate;
