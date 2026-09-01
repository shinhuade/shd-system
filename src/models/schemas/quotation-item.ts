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

export const QuotationItemSchema = z
  .object({
    quotationId: z.string({ message: '報價單必填' }),
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
