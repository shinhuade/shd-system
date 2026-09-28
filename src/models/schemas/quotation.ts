import { z } from 'zod';
import { QUOTE_MODES } from './quotation-item';

export const QUOTATION_STATUSES = ['draft', 'final'] as const;
export const QUOTATION_TIERS = ['cost', 'standard', 'high_margin', 'unit_price', 'custom'] as const;
export type QuotationTier = (typeof QUOTATION_TIERS)[number];

/**
 * 報價當下的客戶聯絡資料快照。
 *
 * 報價單要印出送貨地址與發票地址，而主檔日後可能變更；已開出去的報價必須留著
 * 當時的內容，因此存檔時一併寫入，檢視時不回頭讀主檔。
 */
export const CustomerSnapshotSchema = z
  .object({
    name: z.string(),
    customerCode: z.string().optional(),
    taxId: z.string().optional(),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    shippingAddress: z.string().optional(),
    invoiceAddress: z.string().optional(),
  })
  .strict();

export type CustomerSnapshotInput = z.infer<typeof CustomerSnapshotSchema>;

export const QuotationSchema = z
  .object({
    quotationNo: z.string({ message: '報價單號必填' }).trim().min(1),
    /** 報價來源模式，供報價紀錄區分「精算報價」與舊版報價精靈 */
    quoteMode: z.enum(QUOTE_MODES).default('wizard'),
    customerId: z.string({ message: '客戶必填' }),
    /** 報價當下的客戶聯絡資料；此欄位加入前的舊報價沒有值 */
    customerSnapshot: CustomerSnapshotSchema.optional(),
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
