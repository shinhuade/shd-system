import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { ProductionRecordInput } from './schemas/production-record';

export interface IProductionRecord extends Omit<ProductionRecordInput, 'createdBy'>, Document {
  createdBy?: mongoose.Types.ObjectId;
}

const ProductionMetricSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String },
  },
  { _id: false },
);

const ProductionRecordSchema: Schema = new Schema(
  {
    periodMonth: { type: String, required: true, unique: true },
    workingDays: { type: Number, required: true, default: 0 },
    producedCai: { type: Number, required: true, default: 0 },
    avgFilmThicknessUm: { type: Number },
    powderUsageKg: { type: Number },
    gasUsage: { type: Number },
    electricityUsageKwh: { type: Number },
    waterUsage: { type: Number },
    extraMetrics: { type: [ProductionMetricSchema], default: [] },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

const ProductionRecord: Model<IProductionRecord> =
  mongoose.models.ProductionRecord || mongoose.model<IProductionRecord>('ProductionRecord', ProductionRecordSchema);

export default ProductionRecord;
