import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { PackagingPriceHistoryInput } from './schemas/packaging';

export interface IPackagingPriceHistory
  extends Omit<PackagingPriceHistoryInput, 'packagingId' | 'createdBy'>,
    Document {
  packagingId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

const PackagingPriceHistorySchema: Schema = new Schema(
  {
    packagingId: { type: Schema.Types.ObjectId, ref: 'PackagingItem', required: true, index: true },
    unitPrice: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

PackagingPriceHistorySchema.index({ packagingId: 1, effectiveDate: -1 });

const PackagingPriceHistory: Model<IPackagingPriceHistory> =
  mongoose.models.PackagingPriceHistory ||
  mongoose.model<IPackagingPriceHistory>('PackagingPriceHistory', PackagingPriceHistorySchema);

export default PackagingPriceHistory;
