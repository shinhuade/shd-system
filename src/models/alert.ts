import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { AlertInput, ALERT_TYPES, ALERT_SEVERITIES, ALERT_STATUSES } from './schemas/alert';

export interface IAlert
  extends Omit<AlertInput, 'quotationId' | 'quotationItemId' | 'createdBy'>,
    Document {
  quotationId?: mongoose.Types.ObjectId;
  quotationItemId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

const AlertSchema: Schema = new Schema(
  {
    type: { type: String, enum: ALERT_TYPES, required: true },
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    quotationItemId: { type: Schema.Types.ObjectId, ref: 'QuotationItem', index: true },
    workpieceName: { type: String },
    originalTotalCost: { type: Number, default: 0 },
    currentTotalCost: { type: Number, default: 0 },
    percentChange: { type: Number, default: 0 },
    originalMarginRatePercent: { type: Number, default: 0 },
    currentMarginRateIfUnchanged: { type: Number, default: 0 },
    suggestedNewPrice: { type: Number, default: 0 },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true },
    status: { type: String, enum: ALERT_STATUSES, default: 'open', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    resolvedAt: { type: Date },
  },
  commonOptions,
);

const Alert: Model<IAlert> = mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);

export default Alert;
