import { z } from 'zod';

/**
 * 水電瓦斯的計價項目。
 *
 * 瓦斯分成兩種獨立項目而非一種：天然氣按立方公尺計價、還要依當月平均熱值調整，
 * 桶裝瓦斯按公斤計價、沒有熱值調整（見 lib/pricing/gas-cost）。兩者單價與單位都不同，
 * 合併成一筆就無法各自留下牌價歷史。
 *
 * 'gas' 是拆分前的舊項目，保留在列表中只為了讓既有資料仍能讀取與顯示，
 * 不再提供新增；請改用 gas_natural / gas_bottled。
 */
export const UTILITY_TYPES = ['gas_natural', 'gas_bottled', 'water', 'electricity', 'gas'] as const;

export type UtilityType = (typeof UTILITY_TYPES)[number];

/** 可新增的項目（不含已停用的舊 'gas'） */
export const ACTIVE_UTILITY_TYPES = ['gas_natural', 'gas_bottled', 'water', 'electricity'] as const;

export const UTILITY_TYPE_LABELS: Record<UtilityType, string> = {
  gas_natural: '天然氣',
  gas_bottled: '桶裝瓦斯',
  water: '水費',
  electricity: '電費',
  gas: '瓦斯（舊）',
};

/** 各項目的預設計價單位，新增時預帶，仍可自行修改 */
export const UTILITY_TYPE_DEFAULT_UNITS: Record<UtilityType, string> = {
  gas_natural: '元/m³',
  gas_bottled: '元/kg',
  water: '元/度',
  electricity: '元/kWh',
  gas: '元/度',
};

export const UtilityRateSchema = z
  .object({
    type: z.enum(UTILITY_TYPES),
    unitLabel: z.string({ message: '計價單位必填' }).trim().min(1, { message: '計價單位必填' }),
    currentUnitPrice: z.number({ message: '單價必填' }).min(0),
    lastEffectiveDate: z.coerce.date().optional(),
  })
  .strict();

export type UtilityRateInput = z.infer<typeof UtilityRateSchema>;

export const UtilityRateBaseCreateSchema = z
  .object({
    type: z.enum(UTILITY_TYPES),
    unitLabel: z.string({ message: '計價單位必填' }).trim().min(1, { message: '計價單位必填' }),
  })
  .strict();

export type UtilityRateBaseCreateInput = z.infer<typeof UtilityRateBaseCreateSchema>;

export const UtilityRateHistorySchema = z
  .object({
    utilityRateId: z.string({ message: '水電瓦斯項目必填' }),
    unitPrice: z.number({ message: '單價必填' }).min(0),
    effectiveDate: z.coerce.date({ message: '生效日期必填' }),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type UtilityRateHistoryInput = z.infer<typeof UtilityRateHistorySchema>;
