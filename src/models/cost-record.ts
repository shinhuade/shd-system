import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { CostRecordInput } from './schemas/cost-record';

export interface ICostRecord extends Omit<CostRecordInput, 'createdBy'>, Document {
  createdBy?: mongoose.Types.ObjectId;
}

const CostRecordSchema: Schema = new Schema(
  {
    // 類別不用 enum：除了內建類別外，使用者可在「每月成本紀錄」新增自訂成本項目
    category: { type: String, required: true },
    label: { type: String },
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
