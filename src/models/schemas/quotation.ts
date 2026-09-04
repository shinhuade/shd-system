import { z } from 'zod';
import { QUOTE_MODES } from './quotation-item';

export const QUOTATION_STATUSES = ['draft', 'final'] as const;
export const QUOTATION_TIERS = ['cost', 'standard', 'high_margin', 'custom'] as const;

export const QuotationSchema = z
  .object({
    quotationNo: z.string({ message: '報價單號必填' }).trim().min(1),
    /** 報價來源模式，供報價紀錄區分「精算報價」與舊版報價精靈 */
    quoteMode: z.enum(QUOTE_MODES).default('wizard'),
    customerId: z.string({ message: '客戶必填' }),
    quotationDate: z.coerce.date({ message: '報價日期必填' }),
    status: z.enum(QUOTATION_STATUSES).default('draft'),
    createdBy: z.string().optional(),
    notes: z.string().optional(),
    totalCostPrice: z.number().default(0),
    totalStandardPrice: z.number().default(0),
    totalHighMarginPrice: z.number().default(0),
    chosenTier: z.enum(QUOTATION_TIERS).default('standard'),
    chosenPrice: z.number().default(0),
    marginAmount: z.number().default(0),
    marginRatePercent: z.number().default(0),
    markupRatePercent: z.number().default(0),
    pricingConfigSnapshotId: z.string().optional(),
    processingParamsSnapshotId: z.string().optional(),
  })
  .strict();

export type QuotationInput = z.infer<typeof QuotationSchema>;
