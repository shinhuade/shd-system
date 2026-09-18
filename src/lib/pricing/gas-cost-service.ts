import dbConnect from '@/lib/db';
import ProductionRecord from '@/models/production-record';
import UtilityRate from '@/models/utility-rate';
import UtilityRateHistory from '@/models/utility-rate-history';
import { getValueAsOf } from './versioning';
import { UtilityType } from '@/models/schemas/utility-rate';
import { computeMonthlyGasCost, MonthlyGasCostResult, NATURAL_GAS_BASE_HEATING_VALUE } from './gas-cost';

/**
 * 瓦斯成本試算的資料庫串接層：把「當月生產紀錄的用量 + 當月有效的瓦斯牌價」
 * 組成參數，再交給純函式引擎 computeMonthlyGasCost 計算。
 *
 * 單價一律取「該月最後一天當下有效」的歷史版本，而不是主檔上的目前單價：
 * 補算三個月前的帳時，要用的是當時的單價，不是今天的。沒有任何歷史版本時
 * 才退回主檔目前值，並在 priceSource 標明，讓使用者知道這個數字的來源。
 *
 * 回傳同時包含「已存用量」與「依該用量算出的金額」：前者給試算卡片預帶輸入框，
 * 後者讓這支 API 單獨呼叫時也有意義。卡片上使用者改動用量後的即時金額，
 * 是在前端用同一支純函式引擎重算的，兩邊算式保證一致。
 */
export interface GasCostEstimateSource {
  /** 有沒有建立這個瓦斯項目的牌價主檔 */
  configured: boolean;
  unitPrice: number;
  unitLabel?: string;
  /** 採用的牌價生效日；退回主檔目前值時為 undefined */
  priceEffectiveDate?: Date;
  priceSource: 'history' | 'current' | 'missing';
}

/** 當月已存的瓦斯用量，供試算卡片帶入輸入框 */
export interface GasUsageSnapshot {
  naturalGasUsageM3: number;
  naturalGasAvgHeatingValue: number;
  bottledGasUsageKg: number;
}

export interface GasCostEstimate extends MonthlyGasCostResult {
  periodMonth: string;
  /** 當月有沒有生產紀錄。沒有的話用量全為 0，金額也會是 0 */
  hasProductionRecord: boolean;
  /** 目前存在生產紀錄裡的用量，試算卡片用它預帶輸入框 */
  usage: GasUsageSnapshot;
  naturalSource: GasCostEstimateSource;
  bottledSource: GasCostEstimateSource;
}

/** 該月最後一刻，用來決定要套用哪一版牌價 */
function endOfMonth(periodMonth: string): Date {
  const [year, month] = periodMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

async function resolveUnitPrice(type: UtilityType, asOf: Date): Promise<GasCostEstimateSource> {
  const rate = await UtilityRate.findOne({ type }).lean();
  if (!rate) {
    return { configured: false, unitPrice: 0, priceSource: 'missing' };
  }

  const history = (await getValueAsOf(UtilityRateHistory, 'utilityRateId', String(rate._id), asOf)) as {
    unitPrice?: number;
    effectiveDate?: Date;
  } | null;

  if (history?.unitPrice != null) {
    return {
      configured: true,
      unitPrice: history.unitPrice,
      unitLabel: rate.unitLabel,
      priceEffectiveDate: history.effectiveDate,
      priceSource: 'history',
    };
  }

  return {
    configured: true,
    unitPrice: rate.currentUnitPrice || 0,
    unitLabel: rate.unitLabel,
    priceSource: 'current',
  };
}

export async function estimateMonthlyGasCost(periodMonth: string): Promise<GasCostEstimate> {
  await dbConnect();

  const asOf = endOfMonth(periodMonth);
  const [production, naturalSource, bottledSource] = await Promise.all([
    ProductionRecord.findOne({ periodMonth }).lean(),
    resolveUnitPrice('gas_natural', asOf),
    resolveUnitPrice('gas_bottled', asOf),
  ]);

  const naturalGasUsageM3 = production?.naturalGasUsageM3 ?? 0;
  const bottledGasUsageKg = production?.bottledGasUsageKg ?? 0;
  const avgHeatingValueKcal = production?.naturalGasAvgHeatingValue ?? 0;

  const result = computeMonthlyGasCost({
    natural: {
      supplyVolumeM3: naturalGasUsageM3,
      unitPricePerM3: naturalSource.unitPrice,
      avgHeatingValueKcal,
      baseHeatingValueKcal: NATURAL_GAS_BASE_HEATING_VALUE,
    },
    bottled: {
      usageKg: bottledGasUsageKg,
      unitPricePerKg: bottledSource.unitPrice,
    },
  });

  return {
    ...result,
    periodMonth,
    hasProductionRecord: Boolean(production),
    usage: { naturalGasUsageM3, naturalGasAvgHeatingValue: avgHeatingValueKcal, bottledGasUsageKg },
    naturalSource,
    bottledSource,
  };
}
