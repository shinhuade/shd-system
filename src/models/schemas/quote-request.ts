import { z } from 'zod';
import { QUOTATION_STATUSES, QUOTATION_TIERS } from './quotation';

/**
 * 智慧報價精靈的請求驗證 schema。與 quotation-item.ts 的儲存型 schema不同──
 * 這裡只驗證「使用者輸入」的部分，成本拆解/快照等計算結果由伺服器端算出。
 */
export const WorkpieceCalcInputSchema = z
  .object({
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
    estimatedFilmThicknessUm: z.number().min(0).optional(),
    overrideMaterialUsageKg: z.number().min(0).optional(),
    workpieceFormulaTemplateId: z.string().optional(),
    lwFaces: z.number().int().min(0).max(2).default(0),
    lhFaces: z.number().int().min(0).max(2).default(0),
    whFaces: z.number().int().min(0).max(2).default(0),
    hangCount: z.number().min(0).default(0),
    ovenCapacityPerBatch: z.number().min(0).default(0),
    batchCount: z.number().min(0).default(1),
    estimatedProcessingHours: z.number().min(0).optional(),
    needsPretreatment: z.boolean().default(false),
    needsRustProof: z.boolean().default(false),
    needsRustRemoval: z.boolean().default(false),
    pretreatmentCost: z.number().min(0).optional(),
    outsourcingCost: z.number().min(0).optional(),
    wastageCost: z.number().min(0).optional(),
    packagingQuantity: z.number().min(0).optional(),
  })
  .strict();

export type WorkpieceCalcInput = z.infer<typeof WorkpieceCalcInputSchema>;

export const CalculateQuoteRequestSchema = z
  .object({
    materialId: z.string({ message: '粉料必填' }),
    packagingId: z.string().optional(),
    workpiece: WorkpieceCalcInputSchema,
  })
  .strict();

export type CalculateQuoteRequest = z.infer<typeof CalculateQuoteRequestSchema>;

export const QuoteItemCreateSchema = WorkpieceCalcInputSchema.extend({
  workpieceName: z.string({ message: '工件名稱必填' }).trim().min(1),
  workpieceCode: z.string().trim().optional(),
  materialTypeLabel: z.string().trim().optional(),
  surfaceCondition: z.string().trim().optional(),
  paintColor: z.string().trim().optional(),
  materialId: z.string({ message: '粉料必填' }),
  packagingId: z.string().optional(),
  chosenTier: z.enum(QUOTATION_TIERS).default('standard'),
  customPrice: z.number().min(0).optional(),
});

export type QuoteItemCreateInput = z.infer<typeof QuoteItemCreateSchema>;

export const CreateQuotationRequestSchema = z
  .object({
    customerId: z.string({ message: '客戶必填' }),
    quotationDate: z.coerce.date().optional(),
    notes: z.string().optional(),
    status: z.enum(QUOTATION_STATUSES).default('final'),
    items: z.array(QuoteItemCreateSchema).min(1, { message: '至少需要一項工件' }),
  })
  .strict();

export type CreateQuotationRequest = z.infer<typeof CreateQuotationRequestSchema>;
