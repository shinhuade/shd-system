import { z } from 'zod';

/**
 * 客戶／廠商主檔。
 *
 * 同一家公司常常既是客戶也是廠商（賣粉給我們、也送件來烤），因此不拆成兩份主檔，
 * 而是用 isCustomer / isSupplier 兩個身分旗標標記，一家公司只需要維護一筆聯絡資料，
 * 電話改了不用兩邊各改一次。兩種身分各自有自己的編號欄位，因為客戶編號與廠商編號
 * 通常是兩套不同的流水號。
 *
 * 模型名稱維持 Customer：報價單以 customerId 參照這份主檔，改名會切斷既有報價的關聯。
 */
export const CustomerSchema = z
  .object({
    name: z.string({ message: '名稱必填' }).trim().min(1, { message: '名稱必填' }),

    /** 身分旗標，可同時成立；兩者皆否時由 refine 擋下 */
    isCustomer: z.boolean().default(true),
    isSupplier: z.boolean().default(false),

    /** 客戶編號（身分為客戶時使用），沿用貴司既有的編號規則，系統不自動產生 */
    customerCode: z.string().trim().optional(),
    /** 廠商編號（身分為廠商時使用） */
    supplierCode: z.string().trim().optional(),

    contactPerson: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    fax: z.string().trim().optional(),
    email: z.string().trim().optional(),

    /** 送貨地址：成品要送到哪裡 */
    shippingAddress: z.string().trim().optional(),
    /** 發票地址：帳單與發票寄到哪裡，常與送貨地址不同 */
    invoiceAddress: z.string().trim().optional(),
    /**
     * 拆成送貨／發票地址之前的單一地址欄位。
     * 既有資料仍讀得到，表單只在它有值時顯示並提示搬移，不再寫入新值。
     */
    address: z.string().trim().optional(),

    taxId: z.string().trim().optional(),
    /** 客戶專屬毛利率標準 (%)，精算報價會優先採用 */
    targetMarginRatePercent: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .strict()
  .refine((value) => value.isCustomer || value.isSupplier, {
    message: '請至少勾選一種身分（客戶或廠商）',
    path: ['isCustomer'],
  });

export type CustomerInput = z.infer<typeof CustomerSchema>;
