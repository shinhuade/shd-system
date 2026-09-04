import dbConnect from '@/lib/db';
import CostRecord from '@/models/cost-record';
import ProductionRecord from '@/models/production-record';
import { buildCostModel, CostModel, MonthlyCostEntry } from './cost-model';

/**
 * 成本模型的資料庫載入層（src/lib/pricing 底下只有這裡與 rates-loader 會碰資料庫）。
 *
 * 精算報價「自動抓取最新月份的成本模型」：
 * 取最新一個「同時有生產紀錄（才數 > 0）」的月份，搭配該月的每月成本紀錄組成模型。
 */
export interface LoadedCostModel {
  model: CostModel;
  /** 是否為系統自動選出的最新月份（false 代表呼叫端指定了月份） */
  isLatest: boolean;
}

async function loadCostEntries(periodMonth: string): Promise<MonthlyCostEntry[]> {
  const records = await CostRecord.find({ periodMonth }).lean();
  return records.map((record) => ({
    category: record.category,
    label: record.label,
    amount: record.amount,
  }));
}

export async function loadCostModelForMonth(periodMonth: string, isLatest = false): Promise<LoadedCostModel> {
  await dbConnect();

  const [production, costs] = await Promise.all([
    ProductionRecord.findOne({ periodMonth }).lean(),
    loadCostEntries(periodMonth),
  ]);

  if (!production) {
    throw new Error(`${periodMonth} 尚未建立生產紀錄，請先至「成本管理 → 每月生產紀錄」輸入當月工作天數與實際生產才數`);
  }
  if (!production.producedCai) {
    throw new Error(`${periodMonth} 的實際生產才數為 0，無法計算每才成本，請先更新生產紀錄`);
  }
  if (costs.length === 0) {
    throw new Error(`${periodMonth} 尚未建立成本紀錄，請先至「成本管理 → 每月成本紀錄」輸入當月成本`);
  }

  const model = buildCostModel({
    periodMonth,
    costs,
    production: {
      periodMonth,
      workingDays: production.workingDays,
      producedCai: production.producedCai,
      avgFilmThicknessUm: production.avgFilmThicknessUm,
      powderUsageKg: production.powderUsageKg,
      gasUsage: production.gasUsage,
      electricityUsageKwh: production.electricityUsageKwh,
      waterUsage: production.waterUsage,
    },
  });

  return { model, isLatest };
}

/** 找出最新一個可用來建立成本模型的月份（有生產紀錄且才數 > 0） */
export async function findLatestCostModelMonth(): Promise<string | null> {
  await dbConnect();
  const latest = await ProductionRecord.findOne({ producedCai: { $gt: 0 } }).sort({ periodMonth: -1 }).lean();
  return latest?.periodMonth ?? null;
}

export async function loadLatestCostModel(): Promise<LoadedCostModel> {
  const periodMonth = await findLatestCostModelMonth();
  if (!periodMonth) {
    throw new Error('尚未建立任何生產紀錄，精算報價需要「每月成本紀錄」與「每月生產紀錄」才能計算，請先至「成本管理」輸入');
  }
  return loadCostModelForMonth(periodMonth, true);
}

/** 指定月份則用該月，否則自動採用最新月份 */
export async function loadCostModel(periodMonth?: string | null): Promise<LoadedCostModel> {
  if (periodMonth) return loadCostModelForMonth(periodMonth);
  return loadLatestCostModel();
}
