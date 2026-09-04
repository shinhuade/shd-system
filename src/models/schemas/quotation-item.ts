import { z } from 'zod';

const CostParamsSnapshotSchema = z.object({
  materialPricePerKg: z.number().default(0),
  materialLossRatePercent: z.number().default(0),
  packagingUnitPrice: z.number().default(0),
  hourlyLaborCost: z.number().default(0),
  hourlyGasCost: z.number().default(0),
  hourlyElectricityCost: z.number().default(0),
  hourlyEquipmentCost: z.number().default(0),
  hourlyFactoryCost: z.number().default(0),
  hourlyManagementCost: z.number().default(0),
});

const CostBreakdownSchema = z.object({
  materialCost: z.number().default(0),
  laborCost: z.number().default(0),
  /** 精算報價的能源成本（電費＋瓦斯＋水費合併），一般報價精靈為 0 */
  energyCost: z.number().default(0),
  gasCost: z.number().default(0),
  electricityCost: z.number().default(0),
  waterCost: z.number().default(0),
  packagingCost: z.number().default(0),
  pretreatmentCost: z.number().default(0),
  outsourcingCost: z.number().default(0),
  wastageCost: z.number().default(0),
  indirectCostTotal: z.number().default(0),
  totalDirectCost: z.number().default(0),
  totalCost: z.number().default(0),
});

/**
 * 精算報價的成本模型快照。歷史報價不可因為之後成本資料更新而改變，
 * 因此把當時的每才成本、粉體單價、係數全部凍結寫入這裡。
 */
const CostModelSnapshotSchema = z.object({
  periodMonth: z.string(),
  producedCai: z.number().default(0),
  workingDays: z.number().default(0),
  baseCostTotal: z.number().default(0),
  baseCostPerCai: z.number().default(0),
  laborPerCai: z.number().default(0),
  energyPerCai: z.number().default(0),
  fixedPerCai: z.number().default(0),
  powderDensityGPerCm3: z.number().default(0),
  transferEfficiencyPercent: z.number().default(0),
  powderUsageKg: z.number().default(0),
  costPerCai: z.number().default(0),
  targetMarginRatePercent: z.number().default(0),
});

export const QUOTE_MODES = ['wizard', 'quick', 'precision'] as const;

export const QuotationItemSchema = z
  .object({
    quotationId: z.string({ message: '報價單必填' }),
    /** wizard：舊版報價精靈；precision：精算報價 */
    quoteMode: z.enum(QUOTE_MODES).default('wizard'),
    costModelSnapshot: CostModelSnapshotSchema.optional(),
    workpieceName: z.string({ message: '工件名稱必填' }).trim().min(1),
    workpieceCode: z.string().trim().optional(),
    dimensions: z
      .object({
        length: z.number().min(0).optional(),
        width: z.number().min(0).optional(),
        height: z.number().min(0).optional(),
      })
      .optional(),
    quantity: z.number({ message: '數量必填' }).min(1),
    unitWeightKg: z.number().min(0).optional(),
    totalWeightKg: z.number().min(0).optional(),
    materialTypeLabel: z.string().trim().optional(),
    surfaceCondition: z.string().trim().optional(),
    needsPretreatment: z.boolean().default(false),
    needsRustProof: z.boolean().default(false),
    needsRustRemoval: z.boolean().default(false),
    paintColor: z.string().trim().optional(),
    materialId: z.string({ message: '粉料必填' }),
    estimatedFilmThicknessUm: z.number().min(0).optional(),
    overrideMaterialUsageKg: z.number().min(0).optional(),
    packagingId: z.string().optional(),
    packagingQuantity: z.number().min(0).optional(),

    /** 才數／面數公式快照（Layer 1 結果），一律凍結在報價當下，之後範本異動不會回頭影響 */
    workpieceFormulaTemplateId: z.string().optional(),
    formulaCode: z.string().optional(),
    lwFaces: z.number().min(0).max(2).default(0),
    lhFaces: z.number().min(0).max(2).default(0),
    whFaces: z.number().min(0).max(2).default(0),
    totalAreaCm2: z.number().min(0).default(0),
    caiCount: z.number().min(0).default(0),

    hangCount: z.number().min(0).default(0),
    ovenCapacityPerBatch: z.number().min(0).default(0),
    batchCount: z.number().min(0).default(1),
    estimatedProcessingHours: z.number().min(0).default(0),

    costParamsSnapshot: CostParamsSnapshotSchema,
    costBreakdown: CostBreakdownSchema,

    costPrice: z.number().default(0),
    standardPrice: z.number().default(0),
    highMarginPrice: z.number().default(0),
    chosenPrice: z.number().default(0),
    marginAmount: z.number().default(0),
    marginRatePercent: z.number().default(0),
    markupRatePercent: z.number().default(0),
  })
  .strict();

export type QuotationItemInput = z.infer<typeof QuotationItemSchema>;
