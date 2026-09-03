import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { QuotationItemInput, QUOTE_MODES } from './schemas/quotation-item';

export interface IQuotationItem
  extends Omit<QuotationItemInput, 'quotationId' | 'materialId' | 'packagingId' | 'workpieceFormulaTemplateId'>,
    Document {
  quotationId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  packagingId?: mongoose.Types.ObjectId;
  workpieceFormulaTemplateId?: mongoose.Types.ObjectId;
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
    // 精算報價的能源成本（電費＋瓦斯＋水費合併）
    energyCost: { type: Number, default: 0 },
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

// 精算報價的成本模型快照：凍結報價當下的每才成本與粉體係數，之後成本更新不影響歷史報價
const CostModelSnapshotSchema = new Schema(
  {
    periodMonth: { type: String },
    producedCai: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    baseCostTotal: { type: Number, default: 0 },
    baseCostPerCai: { type: Number, default: 0 },
    laborPerCai: { type: Number, default: 0 },
    energyPerCai: { type: Number, default: 0 },
    fixedPerCai: { type: Number, default: 0 },
    powderDensityGPerCm3: { type: Number, default: 0 },
    transferEfficiencyPercent: { type: Number, default: 0 },
    powderUsageKg: { type: Number, default: 0 },
    costPerCai: { type: Number, default: 0 },
    targetMarginRatePercent: { type: Number, default: 0 },
  },
  { _id: false },
);

const QuotationItemSchema: Schema = new Schema(
  {
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true, index: true },
    quoteMode: { type: String, enum: QUOTE_MODES, default: 'wizard' },
    costModelSnapshot: { type: CostModelSnapshotSchema },
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

    workpieceFormulaTemplateId: { type: Schema.Types.ObjectId, ref: 'WorkpieceFormulaTemplate' },
    formulaCode: { type: String },
    lwFaces: { type: Number, default: 0 },
    lhFaces: { type: Number, default: 0 },
    whFaces: { type: Number, default: 0 },
    totalAreaCm2: { type: Number, default: 0 },
    caiCount: { type: Number, default: 0 },

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
