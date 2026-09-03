import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { MaterialInput } from './schemas/material';

export interface IMaterial extends MaterialInput, Document {}

const MaterialSchema: Schema = new Schema(
  {
    materialCode: { type: String, required: true, unique: true },
    colorName: { type: String, required: true },
    colorFamily: { type: String, index: true },
    colorHex: { type: String },
    supplierName: { type: String },
    supplierContact: { type: String },
    unit: { type: String, default: 'kg' },
    currentPricePerKg: { type: Number, default: 0 },
    currentLossRatePercent: { type: Number, default: null },
    lastEffectiveDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  commonOptions,
);

const Material: Model<IMaterial> = mongoose.models.Material || mongoose.model<IMaterial>('Material', MaterialSchema);

export default Material;
