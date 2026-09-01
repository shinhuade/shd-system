import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { FixedCostInput, FIXED_COST_CATEGORIES } from './schemas/fixed-cost';

export interface IFixedCost extends FixedCostInput, Document {}

const FixedCostSchema: Schema = new Schema(
  {
    category: { type: String, enum: FIXED_COST_CATEGORIES, required: true },
    label: { type: String, required: true },
    currentMonthlyAmount: { type: Number, default: 0 },
    lastEffectiveDate: { type: Date },
  },
  commonOptions,
);

const FixedCost: Model<IFixedCost> = mongoose.models.FixedCost || mongoose.model<IFixedCost>('FixedCost', FixedCostSchema);

export default FixedCost;
