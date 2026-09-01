import { z } from 'zod';

export const COST_RECORD_CATEGORIES = [
  'material',
  'packaging',
  'gas',
  'water',
  'electricity',
  'labor',
  'fixed_other',
] as const;

export const CostRecordSchema = z
  .object({
    category: z.enum(COST_RECORD_CATEGORIES),
    periodMonth: z
      .string({ message: '月份必填' })
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '月份格式須為 YYYY-MM' }),
    amount: z.number({ message: '金額必填' }).min(0),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type CostRecordInput = z.infer<typeof CostRecordSchema>;
