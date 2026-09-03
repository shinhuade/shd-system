import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { QuotationInput, QUOTATION_STATUSES, QUOTATION_TIERS } from './schemas/quotation';

export interface IQuotation
  extends Omit<QuotationInput, 'customerId' | 'createdBy' | 'pricingConfigSnapshotId' | 'processingParamsSnapshotId'>,
    Document {
  customerId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  pricingConfigSnapshotId?: mongoose.Types.ObjectId;
  processingParamsSnapshotId?: mongoose.Types.ObjectId;
}

const QuotationSchema: Schema = new Schema(
  {
    quotationNo: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    quotationDate: { type: Date, required: true },
    status: { type: String, enum: QUOTATION_STATUSES, default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    notes: { type: String },
    totalCostPrice: { type: Number, default: 0 },
    totalStandardPrice: { type: Number, default: 0 },
    totalHighMarginPrice: { type: Number, default: 0 },
    chosenTier: { type: String, enum: QUOTATION_TIERS, default: 'standard' },
    chosenPrice: { type: Number, default: 0 },
    marginAmount: { type: Number, default: 0 },
    marginRatePercent: { type: Number, default: 0 },
    markupRatePercent: { type: Number, default: 0 },
    pricingConfigSnapshotId: { type: Schema.Types.ObjectId, ref: 'SystemSettings' },
    processingParamsSnapshotId: { type: Schema.Types.ObjectId, ref: 'ProcessingCostParams' },
  },
  commonOptions,
);

const Quotation: Model<IQuotation> = mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

export default Quotation;
