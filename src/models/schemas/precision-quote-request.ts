import { z } from 'zod';
import { QUOTATION_STATUSES } from './quotation';

/**
 * 精算報價 API 的請求驗證。
 * 使用者只需要提供「尺寸 / 面數 / 膜厚 / 粉體 / 數量」，
 * 所有成本一律由伺服器端從成本模型與粉體資料庫取得，前端送來的成本數字一概不採用。
 */
export const PrecisionQuoteCalcSchema = z
  .object({
    materialId: z.string({ message: '粉體必填' }).min(1, { message: '粉體必填' }),
    dimensions: z
      .object({
        length: z.number().min(0).optional(),
        width: z.number().min(0).optional(),
        height: z.number().min(0).optional(),
      })
      .optional(),
    lwFaces: z.number().min(0).default(0),
    lhFaces: z.number().min(0).default(0),
    whFaces: z.number().min(0).default(0),
    workpieceFormulaTemplateId: z.string().optional(),
    filmThicknessUm: z.number({ message: '膜厚必填' }).min(0),
    quantity: z.number().min(1).default(1),
    targetMarginRatePercent: z.number().min(0).max(99.9).optional(),
    costModelPeriodMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '月份格式須為 YYYY-MM' })
      .optional(),
  })
  .strict();

export type PrecisionQuoteCalcInput = z.infer<typeof PrecisionQuoteCalcSchema>;

export const CreatePrecisionQuotationSchema = PrecisionQuoteCalcSchema.extend({
  customerId: z.string({ message: '客戶必填' }).min(1, { message: '客戶必填' }),
  workpieceName: z.string({ message: '工件名稱必填' }).trim().min(1, { message: '工件名稱必填' }),
  workpieceCode: z.string().trim().optional(),
  quotationDate: z.coerce.date().optional(),
  status: z.enum(QUOTATION_STATUSES).default('final'),
  notes: z.string().optional(),
  /** 使用者可覆寫建議報價（例如談定的價格），未填則採用建議報價 */
  chosenPrice: z.number().min(0).optional(),
});

export type CreatePrecisionQuotationInput = z.infer<typeof CreatePrecisionQuotationSchema>;
