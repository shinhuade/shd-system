import { z } from 'zod';

export const CustomerSchema = z
  .object({
    name: z.string({ message: '客戶名稱必填' }).trim().min(1, { message: '客戶名稱必填' }),
    contactPerson: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().optional(),
    address: z.string().trim().optional(),
    taxId: z.string().trim().optional(),
    targetMarginRatePercent: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export type CustomerInput = z.infer<typeof CustomerSchema>;
