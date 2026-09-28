import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { QuotationInput, QUOTATION_STATUSES, QUOTATION_TIERS } from './schemas/quotation';
import { QUOTE_MODES } from './schemas/quotation-item';

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
    quoteMode: { type: String, enum: QUOTE_MODES, default: 'wizard' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    // 報價當下的客戶聯絡資料快照，讓報價單的地址不會被日後的主檔變更改掉
    customerSnapshot: {
      type: new Schema(
        {
          name: { type: String },
          customerCode: { type: String },
          taxId: { type: String },
          contactPerson: { type: String },
          phone: { type: String },
          fax: { type: String },
          shippingAddress: { type: String },
          invoiceAddress: { type: String },
        },
        { _id: false },
      ),
    },
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
