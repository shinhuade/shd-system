import { z } from 'zod';

export const SystemSettingsSchema = z
  .object({
    defaultMaterialLossRatePercent: z.number({ message: '預設粉料損耗率必填' }).min(0).max(100),
    standardMarkupPercent: z.number({ message: '標準報價加成率必填' }).min(0),
    highMarginMarkupPercent: z.number({ message: '高毛利報價加成率必填' }).min(0),
    reQuoteAlertThresholdPercent: z.number({ message: '漲價提醒門檻必填' }).min(0),
    targetMarginRatePercent: z.number({ message: '公司毛利率標準必填' }).min(0).max(100),
    powderUsageGramPerM2PerMicron: z.number({ message: '粉料用量係數必填' }).min(0),
    transferEfficiencyPercent: z.number({ message: '噴塗轉移率必填' }).min(0).max(100),
    standardMonthlyOperatingHours: z.number({ message: '每月標準工時必填' }).min(0),
    standardCycleHoursPerBatch: z.number({ message: '每批次標準加工工時必填' }).min(0),
    /**
     * 尺才換算：1 尺 = 幾才。系統原本沒有定義「尺」與「才」的換算方式，
     * 這裡刻意不給預設值也不做任何猜測——未填寫時快速報價的「一尺單價」不會計算，
     * 由工廠填入自己的換算基準後才啟用。
     */
    caiPerFoot: z.number().min(0).nullable().optional(),
    effectiveDate: z.coerce.date({ message: '生效日期必填' }),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type SystemSettingsInput = z.infer<typeof SystemSettingsSchema>;
