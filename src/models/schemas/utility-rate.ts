import { z } from 'zod';

export const UTILITY_TYPES = ['gas', 'water', 'electricity'] as const;

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
