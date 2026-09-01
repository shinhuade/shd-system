import { z } from 'zod';

export const MaterialSchema = z
  .object({
    materialCode: z.string({ message: '粉料編號必填' }).trim().min(1, { message: '粉料編號必填' }),
    colorName: z.string({ message: '粉料顏色必填' }).trim().min(1, { message: '粉料顏色必填' }),
    colorHex: z.string().trim().optional(),
    supplierName: z.string().trim().optional(),
    supplierContact: z.string().trim().optional(),
    unit: z.string().trim().default('kg'),
    currentPricePerKg: z.number({ message: '單價必填' }).min(0),
    currentLossRatePercent: z.number().min(0).max(100).nullable().optional(),
    lastEffectiveDate: z.coerce.date().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export type MaterialInput = z.infer<typeof MaterialSchema>;

/** 建立粉料基本資料用（不含價格），價格一律於建立後透過 price-history 端點新增第一筆版本 */
export const MaterialBaseCreateSchema = z
  .object({
    materialCode: z.string({ message: '粉料編號必填' }).trim().min(1, { message: '粉料編號必填' }),
    colorName: z.string({ message: '粉料顏色必填' }).trim().min(1, { message: '粉料顏色必填' }),
    colorHex: z.string().trim().optional(),
    supplierName: z.string().trim().optional(),
    supplierContact: z.string().trim().optional(),
    unit: z.string().trim().default('kg'),
    isActive: z.boolean().default(true),
  })
  .strict();

export type MaterialBaseCreateInput = z.infer<typeof MaterialBaseCreateSchema>;

export const MaterialPriceHistorySchema = z
  .object({
    materialId: z.string({ message: '粉料必填' }),
    pricePerKg: z.number({ message: '單價必填' }).min(0),
    lossRatePercent: z.number().min(0).max(100).nullable().optional(),
    effectiveDate: z.coerce.date({ message: '生效日期必填' }),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type MaterialPriceHistoryInput = z.infer<typeof MaterialPriceHistorySchema>;
