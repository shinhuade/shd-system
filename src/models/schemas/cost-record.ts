import { z } from 'zod';

/**
 * 每月成本紀錄的類別。
 *
 * - 前兩項（粉體/包材）是「逐件直接成本」，報價時由粉體資料庫與包材資料庫逐件計算，
 *   因此不列入「每才基本成本」的分攤基礎。
 * - 其餘類別都是工廠每個月實際發生的基本成本，會被分攤到當月生產才數上。
 * - 除了這裡列出的已知類別外，`category` 允許自訂鍵值（例如 custom_xxx），
 *   自訂類別一律歸類到「固定成本」群組，金額同樣參與每才基本成本的計算。
 */
export const COST_RECORD_CATEGORIES = [
  'material',
  'packaging',
  'labor',
  'electricity',
  'gas',
  'water',
  'rent',
  'security',
  'accounting',
  'fixed_other',
] as const;

export type KnownCostCategory = (typeof COST_RECORD_CATEGORIES)[number];

export const COST_RECORD_CATEGORY_LABELS: Record<KnownCostCategory, string> = {
  material: '粉體成本',
  packaging: '包材成本',
  labor: '人事',
  electricity: '電費',
  gas: '瓦斯',
  water: '水費',
  rent: '租金',
  security: '保全',
  accounting: '會計',
  fixed_other: '其他',
};

/** 成本模型的分群：直接成本不進入每才基本成本，其餘依人工／能源／固定分攤 */
export type CostCategoryGroup = 'direct' | 'labor' | 'energy' | 'fixed';

export const COST_CATEGORY_GROUPS: Record<KnownCostCategory, CostCategoryGroup> = {
  material: 'direct',
  packaging: 'direct',
  labor: 'labor',
  electricity: 'energy',
  gas: 'energy',
  water: 'energy',
  rent: 'fixed',
  security: 'fixed',
  accounting: 'fixed',
  fixed_other: 'fixed',
};

export const COST_GROUP_LABELS: Record<CostCategoryGroup, string> = {
  direct: '逐件直接成本',
  labor: '人工成本',
  energy: '能源成本',
  fixed: '固定成本',
};

/** 自訂類別（不在已知清單中）一律視為固定成本 */
export function resolveCostCategoryGroup(category: string): CostCategoryGroup {
  return COST_CATEGORY_GROUPS[category as KnownCostCategory] ?? 'fixed';
}

export function resolveCostCategoryLabel(category: string, label?: string): string {
  return label || COST_RECORD_CATEGORY_LABELS[category as KnownCostCategory] || category;
}

/** 自訂類別的鍵值格式：英數與底線，前綴 custom_ 由前端產生 */
export const costCategoryKey = z
  .string({ message: '成本類別必填' })
  .trim()
  .min(1, { message: '成本類別必填' })
  .max(60)
  .regex(/^[a-z0-9_]+$/i, { message: '成本類別鍵值僅能使用英數與底線' });

export const periodMonthField = z
  .string({ message: '月份必填' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '月份格式須為 YYYY-MM' });

export const CostRecordSchema = z
  .object({
    category: costCategoryKey,
    /** 自訂類別的顯示名稱；已知類別留空即可，顯示時會使用內建標籤 */
    label: z.string().trim().max(60).optional(),
    periodMonth: periodMonthField,
    amount: z.number({ message: '金額必填' }).min(0),
    note: z.string().optional(),
    createdBy: z.string().optional(),
  })
  .strict();

export type CostRecordInput = z.infer<typeof CostRecordSchema>;
