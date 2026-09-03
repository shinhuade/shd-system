import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { PackagingItemInput, PACKAGING_TYPES } from './schemas/packaging';

export interface IPackagingItem extends PackagingItemInput, Document {}

const PackagingItemSchema: Schema = new Schema(
  {
    packagingCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: PACKAGING_TYPES, default: 'packaging', index: true },
    unit: { type: String, default: '個' },
    currentUnitPrice: { type: Number, default: 0 },
    lastEffectiveDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  commonOptions,
);

const PackagingItem: Model<IPackagingItem> =
  mongoose.models.PackagingItem || mongoose.model<IPackagingItem>('PackagingItem', PackagingItemSchema);

export default PackagingItem;
