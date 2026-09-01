import { z } from 'zod';

export const ProcessingCostParamsSchema = z
  .object({
    hourlyLaborCost: z.number({ message: '每小時人工成本必填' }).min(0),
    hourlyGasCost: z.number({ message: '每小時瓦斯成本必填' }).min(0),
    hourlyElectricityCost: z.number({ message: '每小時電力成本必填' }).min(0),
    hourlyWaterCost: z.number().min(0).default(0),
    hourlyEquipmentCost: z.number({ message: '每小時設備成本必填' }).min(0),
    hourlyFactoryCost: z.number({ message: '每小時廠房成本必填' }).min(0),
    hourlyManagementCost: z.number({ message: '每小時管理成本必填' }).min(0),
    effectiveDate: z.coerce.date({ message: '生效日期必填' }),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type ProcessingCostParamsInput = z.infer<typeof ProcessingCostParamsSchema>;
