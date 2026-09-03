import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { LaborRateInput } from './schemas/labor-rate';

export interface ILaborRate extends LaborRateInput, Document {}

const LaborRateSchema: Schema = new Schema(
  {
    label: { type: String, required: true },
    currentHourlyRate: { type: Number, default: 0 },
    lastEffectiveDate: { type: Date },
  },
  commonOptions,
);

const LaborRate: Model<ILaborRate> = mongoose.models.LaborRate || mongoose.model<ILaborRate>('LaborRate', LaborRateSchema);

export default LaborRate;
