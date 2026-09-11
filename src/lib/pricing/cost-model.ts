import {
  CostCategoryGroup,
  COST_GROUP_LABELS,
  resolveCostCategoryGroup,
  resolveCostCategoryLabel,
} from '@/models/schemas/cost-record';

/**
 * 成本模型（純計算，不接觸資料庫）。
 *
 *   每月成本紀錄 ＋ 每月實際生產紀錄
 *        ↓
 *   每才基本成本 = 當月基本成本 ÷ 當月實際生產才數
 *        ↓
 *   精算報價直接使用（使用者不需要重新輸入任何成本）
 *
 * 「基本成本」不含粉體與包材，因為那兩項在報價時是逐件計算的直接成本；
 * 其餘類別（人事／電費／瓦斯／水費／租金／保全／會計／其他／自訂）都會分攤到每一才。
 *
 * 這個模型刻意保留擴充空間：groups/categories 都是資料驅動的陣列，
 * 未來要加入更多實際數據（例如每才粉體用量、每才能源用量）來提高精準度時，
 * 只要在這裡增加欄位即可，不需要改動報價流程。
 */
export interface MonthlyCostEntry {
  category: string;
  label?: string;
  amount: number;
}

export interface MonthlyProductionSummary {
  periodMonth: string;
  workingDays: number;
  producedCai: number;
  avgFilmThicknessUm?: number;
  powderUsageKg?: number;
  gasUsage?: number;
  electricityUsageKwh?: number;
  waterUsage?: number;
}

export interface CostModelCategory {
  category: string;
  label: string;
  group: CostCategoryGroup;
  amount: number;
  perCai: number;
}

export interface CostModelGroup {
  group: CostCategoryGroup;
  label: string;
  amount: number;
  perCai: number;
}

export interface CostModel {
  periodMonth: string;
  workingDays: number;
  producedCai: number;
  avgCaiPerDay: number;
  /** 當月基本成本合計（不含粉體／包材） */
  baseCostTotal: number;
  /** 每才基本成本 = baseCostTotal ÷ producedCai */
  baseCostPerCai: number;
  perCai: {
    labor: number;
    energy: number;
    fixed: number;
    base: number;
  };
  groups: CostModelGroup[];
  categories: CostModelCategory[];
  /** 當月平均膜厚，供未來校正粉體用量估算使用 */
  avgFilmThicknessUm?: number;
  /** 當月每才粉體用量 (kg/才)，供未來校正粉體成本使用 */
  powderUsageKgPerCai?: number;
}

const BASE_GROUPS: CostCategoryGroup[] = ['labor', 'energy', 'fixed'];

export interface BuildCostModelInput {
  periodMonth: string;
  costs: MonthlyCostEntry[];
  production: MonthlyProductionSummary;
}

export function buildCostModel({ periodMonth, costs, production }: BuildCostModelInput): CostModel {
  const producedCai = production.producedCai || 0;
  const perCaiOf = (amount: number) => (producedCai > 0 ? amount / producedCai : 0);

  const categories: CostModelCategory[] = costs
    .filter((entry) => resolveCostCategoryGroup(entry.category) !== 'direct')
    .map((entry) => ({
      category: entry.category,
      label: resolveCostCategoryLabel(entry.category, entry.label),
      group: resolveCostCategoryGroup(entry.category),
      amount: entry.amount || 0,
      perCai: perCaiOf(entry.amount || 0),
    }));

  const groups: CostModelGroup[] = BASE_GROUPS.map((group) => {
    const amount = categories
      .filter((category) => category.group === group)
      .reduce((sum, category) => sum + category.amount, 0);
    return { group, label: COST_GROUP_LABELS[group], amount, perCai: perCaiOf(amount) };
  });

  const baseCostTotal = groups.reduce((sum, group) => sum + group.amount, 0);
  const perCai = {
    labor: groups.find((g) => g.group === 'labor')?.perCai ?? 0,
    energy: groups.find((g) => g.group === 'energy')?.perCai ?? 0,
    fixed: groups.find((g) => g.group === 'fixed')?.perCai ?? 0,
    base: perCaiOf(baseCostTotal),
  };

  return {
    periodMonth,
    workingDays: production.workingDays || 0,
    producedCai,
    avgCaiPerDay: production.workingDays ? producedCai / production.workingDays : 0,
    baseCostTotal,
    baseCostPerCai: perCai.base,
    perCai,
    groups,
    categories,
    avgFilmThicknessUm: production.avgFilmThicknessUm,
    powderUsageKgPerCai:
      production.powderUsageKg && producedCai > 0 ? production.powderUsageKg / producedCai : undefined,
  };
}
