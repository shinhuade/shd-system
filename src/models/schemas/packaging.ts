import { z } from 'zod';

export const PACKAGING_TYPES = ['box', 'pallet', 'foam', 'tape', 'other'] as const;

export const PackagingItemSchema = z
  .object({
    packagingCode: z.string({ message: '包材編號必填' }).trim().min(1, { message: '包材編號必填' }),
    name: z.string({ message: '包材名稱必填' }).trim().min(1, { message: '包材名稱必填' }),
    type: z.enum(PACKAGING_TYPES).default('other'),
    unit: z.string().trim().default('個'),
    currentUnitPrice: z.number({ message: '單價必填' }).min(0),
    lastEffectiveDate: z.coerce.date().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export type PackagingItemInput = z.infer<typeof PackagingItemSchema>;

export const PackagingItemBaseCreateSchema = z
  .object({
    packagingCode: z.string({ message: '包材編號必填' }).trim().min(1, { message: '包材編號必填' }),
    name: z.string({ message: '包材名稱必填' }).trim().min(1, { message: '包材名稱必填' }),
    type: z.enum(PACKAGING_TYPES).default('other'),
    unit: z.string().trim().default('個'),
    isActive: z.boolean().default(true),
  })
  .strict();

export type PackagingItemBaseCreateInput = z.infer<typeof PackagingItemBaseCreateSchema>;

export const PackagingPriceHistorySchema = z
  .object({
    packagingId: z.string({ message: '包材必填' }),
    unitPrice: z.number({ message: '單價必填' }).min(0),
    effectiveDate: z.coerce.date({ message: '生效日期必填' }),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type PackagingPriceHistoryInput = z.infer<typeof PackagingPriceHistorySchema>;
