import { z } from 'zod';

export const LaborRateSchema = z
  .object({
    label: z.string({ message: '名稱必填' }).trim().min(1, { message: '名稱必填' }),
    currentHourlyRate: z.number({ message: '每小時人工成本必填' }).min(0),
    lastEffectiveDate: z.coerce.date().optional(),
  })
  .strict();

export type LaborRateInput = z.infer<typeof LaborRateSchema>;

export const LaborRateBaseCreateSchema = z
  .object({
    label: z.string({ message: '名稱必填' }).trim().min(1, { message: '名稱必填' }),
  })
  .strict();

export type LaborRateBaseCreateInput = z.infer<typeof LaborRateBaseCreateSchema>;

export const LaborRateHistorySchema = z
  .object({
    laborRateId: z.string({ message: '人工成本項目必填' }),
    hourlyRate: z.number({ message: '每小時人工成本必填' }).min(0),
    effectiveDate: z.coerce.date({ message: '生效日期必填' }),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type LaborRateHistoryInput = z.infer<typeof LaborRateHistorySchema>;
