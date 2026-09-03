import { z } from 'zod';

/** 常見色系分類，僅為 UI 建議選項，欄位本身仍是自由文字，可自行輸入其他分類 */
export const COLOR_FAMILY_OPTIONS = ['白色系', '黑色系', '灰色系', '金屬色系', '大地色系', '彩色系', '其他'] as const;

export const MaterialSchema = z
  .object({
    materialCode: z.string({ message: '粉料編號必填' }).trim().min(1, { message: '粉料編號必填' }),
    colorName: z.string({ message: '粉料顏色必填' }).trim().min(1, { message: '粉料顏色必填' }),
    colorFamily: z.string().trim().optional(),
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
    colorFamily: z.string().trim().optional(),
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
