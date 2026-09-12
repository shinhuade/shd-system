import { z } from 'zod';
import { periodMonthField } from './cost-record';

/**
 * 每月實際生產紀錄。與「每月成本紀錄」搭配後即可算出成本模型
 * （每才基本成本 = 當月基本成本 ÷ 當月實際生產才數）。
 *
 * 這裡刻意保留 extraMetrics，讓工廠日後可以自行追蹤更多生產數據
 * （例如各線別產量、不良率），而不需要改資料結構。
 */
export const ProductionMetricSchema = z.object({
  key: z
    .string({ message: '指標鍵值必填' })
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/i, { message: '指標鍵值僅能使用英數與底線' }),
  label: z.string({ message: '指標名稱必填' }).trim().min(1).max(60),
  value: z.number({ message: '指標數值必填' }),
  unit: z.string().trim().max(20).optional(),
});

export type ProductionMetricInput = z.infer<typeof ProductionMetricSchema>;

export const ProductionRecordSchema = z
  .object({
    periodMonth: periodMonthField,
    /** 當月工作天數 */
    workingDays: z.number({ message: '工作天數必填' }).min(0).max(31),
    /** 當月實際生產才數，是成本模型的分母，必須大於 0 才能算出每才成本 */
    producedCai: z.number({ message: '實際生產才數必填' }).min(0),
    /** 當月平均膜厚 (μm) */
    avgFilmThicknessUm: z.number().min(0).optional(),
    /** 當月噴粉量 (kg) */
    powderUsageKg: z.number().min(0).optional(),
    /**
     * 當月天然氣供氣量 (m³)，來自瓦斯帳單。
     * 與下面的平均熱值、以及「水電瓦斯 → 天然氣」的單價一起算出當月天然氣費：
     * 供氣量 × 單價 × (平均熱值 ÷ 基準熱值)，見 lib/pricing/gas-cost。
     */
    naturalGasUsageM3: z.number().min(0).optional(),
    /**
     * 當月天然氣平均熱值 (kcal/m³)，逐月抄自帳單。
     * 每個月都會浮動，因此存在生產紀錄而非系統設定：回頭查舊月份的帳時，
     * 看到的必須是當時的熱值，不能被後來的新值蓋掉。未填則不做熱值調整。
     */
    naturalGasAvgHeatingValue: z.number().min(0).optional(),
    /** 當月桶裝瓦斯用量 (kg)。桶裝按重量計價，沒有熱值調整。 */
    bottledGasUsageKg: z.number().min(0).optional(),
    /**
     * 拆分成天然氣／桶裝之前的瓦斯用量欄位，僅供既有資料顯示，不再寫入新值。
     */
    gasUsage: z.number().min(0).optional(),
    /** 當月用電量 (kWh) */
    electricityUsageKwh: z.number().min(0).optional(),
    /** 當月用水量（單位依工廠帳單，例如度） */
    waterUsage: z.number().min(0).optional(),
    /** 其他可追蹤生產數據 */
    extraMetrics: z.array(ProductionMetricSchema).default([]),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type ProductionRecordInput = z.infer<typeof ProductionRecordSchema>;

/** 平均每天生產才數，工作天數為 0 時回傳 0（不猜測） */
export function computeAvgCaiPerDay(producedCai: number, workingDays: number): number {
  if (!workingDays) return 0;
  return producedCai / workingDays;
}
