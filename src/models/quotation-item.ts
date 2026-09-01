import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { QuotationItemInput } from './schemas/quotation-item';

export interface IQuotationItem extends Omit<QuotationItemInput, 'quotationId' | 'materialId' | 'packagingId'>, Document {
  quotationId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  packagingId?: mongoose.Types.ObjectId;
}

const CostParamsSnapshotSchema = new Schema(
  {
    materialPricePerKg: { type: Number, default: 0 },
    materialLossRatePercent: { type: Number, default: 0 },
    packagingUnitPrice: { type: Number, default: 0 },
    hourlyLaborCost: { type: Number, default: 0 },
    hourlyGasCost: { type: Number, default: 0 },
    hourlyElectricityCost: { type: Number, default: 0 },
    hourlyEquipmentCost: { type: Number, default: 0 },
    hourlyFactoryCost: { type: Number, default: 0 },
    hourlyManagementCost: { type: Number, default: 0 },
  },
  { _id: false },
);

const CostBreakdownSchema = new Schema(
  {
    materialCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    gasCost: { type: Number, default: 0 },
    electricityCost: { type: Number, default: 0 },
    waterCost: { type: Number, default: 0 },
    packagingCost: { type: Number, default: 0 },
    pretreatmentCost: { type: Number, default: 0 },
    outsourcingCost: { type: Number, default: 0 },
    wastageCost: { type: Number, default: 0 },
    indirectCostTotal: { type: Number, default: 0 },
    totalDirectCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
  },
  { _id: false },
);

const QuotationItemSchema: Schema = new Schema(
  {
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true, index: true },
    workpieceName: { type: String, required: true },
    workpieceCode: { type: String },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    quantity: { type: Number, required: true },
    unitWeightKg: { type: Number },
    totalWeightKg: { type: Number },
    materialTypeLabel: { type: String },
    surfaceCondition: { type: String },
    needsPretreatment: { type: Boolean, default: false },
    needsRustProof: { type: Boolean, default: false },
    needsRustRemoval: { type: Boolean, default: false },
    paintColor: { type: String },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
    estimatedFilmThicknessUm: { type: Number },
    overrideMaterialUsageKg: { type: Number },
    packagingId: { type: Schema.Types.ObjectId, ref: 'PackagingItem' },
    packagingQuantity: { type: Number },

    hangCount: { type: Number, default: 0 },
    ovenCapacityPerBatch: { type: Number, default: 0 },
    batchCount: { type: Number, default: 1 },
    estimatedProcessingHours: { type: Number, default: 0 },

    costParamsSnapshot: { type: CostParamsSnapshotSchema, default: () => ({}) },
    costBreakdown: { type: CostBreakdownSchema, default: () => ({}) },

    costPrice: { type: Number, default: 0 },
    standardPrice: { type: Number, default: 0 },
    highMarginPrice: { type: Number, default: 0 },
    chosenPrice: { type: Number, default: 0 },
    marginAmount: { type: Number, default: 0 },
    marginRatePercent: { type: Number, default: 0 },
    markupRatePercent: { type: Number, default: 0 },
  },
  commonOptions,
);

const QuotationItem: Model<IQuotationItem> =
  mongoose.models.QuotationItem || mongoose.model<IQuotationItem>('QuotationItem', QuotationItemSchema);

export default QuotationItem;
