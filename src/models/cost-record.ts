import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { CostRecordInput, COST_RECORD_CATEGORIES } from './schemas/cost-record';

export interface ICostRecord extends Omit<CostRecordInput, 'createdBy'>, Document {
  createdBy?: mongoose.Types.ObjectId;
}

const CostRecordSchema: Schema = new Schema(
  {
    category: { type: String, enum: COST_RECORD_CATEGORIES, required: true },
    periodMonth: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

CostRecordSchema.index({ category: 1, periodMonth: 1 }, { unique: true });

const CostRecord: Model<ICostRecord> = mongoose.models.CostRecord || mongoose.model<ICostRecord>('CostRecord', CostRecordSchema);

export default CostRecord;
