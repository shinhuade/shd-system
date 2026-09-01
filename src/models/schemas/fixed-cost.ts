import { z } from 'zod';

export const FIXED_COST_CATEGORIES = [
  'rent',
  'depreciation',
  'maintenance',
  'management_staff',
  'admin',
  'insurance',
  'other',
] as const;

export const FixedCostSchema = z
  .object({
    category: z.enum(FIXED_COST_CATEGORIES),
    label: z.string({ message: '名稱必填' }).trim().min(1, { message: '名稱必填' }),
    currentMonthlyAmount: z.number({ message: '每月金額必填' }).min(0),
    lastEffectiveDate: z.coerce.date().optional(),
  })
  .strict();

export type FixedCostInput = z.infer<typeof FixedCostSchema>;

export const FixedCostBaseCreateSchema = z
  .object({
    category: z.enum(FIXED_COST_CATEGORIES),
    label: z.string({ message: '名稱必填' }).trim().min(1, { message: '名稱必填' }),
  })
  .strict();

export type FixedCostBaseCreateInput = z.infer<typeof FixedCostBaseCreateSchema>;

export const FixedCostHistorySchema = z
  .object({
    fixedCostId: z.string({ message: '固定成本項目必填' }),
    monthlyAmount: z.number({ message: '每月金額必填' }).min(0),
    effectiveDate: z.coerce.date({ message: '生效日期必填' }),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type FixedCostHistoryInput = z.infer<typeof FixedCostHistorySchema>;
