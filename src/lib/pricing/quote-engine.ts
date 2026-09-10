import { WorkpieceInput, RateSnapshot, PricingConfigSnapshot, CostBreakdown, QuoteSuggestion, QuoteTierResult } from './types';
import { estimateMaterialUsage, computeMaterialCost } from './material-cost';
import { computeProcessingHours, computeProcessingCost } from './processing-cost';
import { computePackagingCost } from './packaging-cost';
import { computeIndirectCostAllocation } from './indirect-cost';

/**
 * 彙總一張工件報價的完整成本拆解。所有係數皆由呼叫端從版本化 Model 組成
 * RateSnapshot / PricingConfigSnapshot 傳入，此函式本身不接觸資料庫、不含任何寫死數字。
 */
export function buildCostBreakdown(
  workpiece: WorkpieceInput,
  rates: RateSnapshot,
  config: PricingConfigSnapshot,
): CostBreakdown {
  const {
    materialUsageKg,
    billingUnit,
    billingWidthCm,
    longestEdgeCm,
    totalAreaCm2,
    caiCount,
    chiCount,
    formulaCode,
  } = estimateMaterialUsage(workpiece, config);
  const materialLossRatePercent =
    rates.materialLossRatePercent ?? config.defaultMaterialLossRatePercent;
  const materialCost = computeMaterialCost(materialUsageKg, rates.materialPricePerKg, materialLossRatePercent);

  const processingHours = computeProcessingHours(workpiece, config);
  const processingCost = computeProcessingCost(processingHours, rates);

  const packagingCost = computePackagingCost(workpiece, rates);
  const pretreatmentCost = workpiece.needsPretreatment || workpiece.needsRustProof || workpiece.needsRustRemoval
    ? workpiece.pretreatmentCost ?? 0
    : 0;
  const outsourcingCost = workpiece.outsourcingCost ?? 0;
  const wastageCost = workpiece.wastageCost ?? 0;

  const indirectCostTotal = computeIndirectCostAllocation(processingCost);

  const totalDirectCost =
    materialCost +
    processingCost.laborCost +
    processingCost.gasCost +
    processingCost.electricityCost +
    processingCost.waterCost +
    packagingCost +
    pretreatmentCost +
    outsourcingCost +
    wastageCost;

  const totalCost = totalDirectCost + indirectCostTotal;

  return {
    materialCost,
    laborCost: processingCost.laborCost,
    gasCost: processingCost.gasCost,
    electricityCost: processingCost.electricityCost,
    waterCost: processingCost.waterCost,
    packagingCost,
    pretreatmentCost,
    outsourcingCost,
    wastageCost,
    indirectCostTotal,
    totalDirectCost,
    totalCost,
    materialUsageKg,
    processingHours,
    billingUnit,
    billingWidthCm,
    longestEdgeCm,
    totalAreaCm2,
    caiCount,
    chiCount,
    formulaCode,
  };
}

function buildTierResult(price: number, costPrice: number): QuoteTierResult {
  const marginAmount = price - costPrice;
  const marginRatePercent = price > 0 ? (marginAmount / price) * 100 : 0;
  const markupRatePercent = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
  return { price, marginAmount, marginRatePercent, markupRatePercent };
}

/** 單價法要乘的計價數量：走才用單件才數，走尺用單件尺數（兩者互斥） */
export function resolveBillingQuantityPerUnit(breakdown: Pick<CostBreakdown, 'billingUnit' | 'caiCount' | 'chiCount'>): number {
  return breakdown.billingUnit === 'chi' ? breakdown.chiCount : breakdown.caiCount;
}

/**
 * 七、報價建議：
 * - 成本加成法（成本價 / 標準報價 / 高毛利報價），加成率一律來自 SystemSettings。
 *   標準報價 = 成本價 × (1 + 標準加成率%)；高毛利報價 = 成本價 × (1 + 高毛利加成率%)
 * - 單價法（unit_price）：報價 = 單件才數或尺數 × 每才／每尺單價 × 數量。
 *   這是實務上對客戶開價的方式；成本仍照常算，用來檢核這個開價的毛利夠不夠。
 *   未提供 billingUnitPrice 時不產生這一檔。
 */
export function buildQuoteSuggestion(
  breakdown: CostBreakdown,
  config: PricingConfigSnapshot,
  workpiece: Pick<WorkpieceInput, 'quantity' | 'billingUnitPrice'>,
): QuoteSuggestion {
  const costPrice = breakdown.totalCost;
  const standardPrice = costPrice * (1 + config.standardMarkupPercent / 100);
  const highMarginPrice = costPrice * (1 + config.highMarginMarkupPercent / 100);

  const billingQuantityPerUnit = resolveBillingQuantityPerUnit(breakdown);
  const unitBasedPrice =
    typeof workpiece.billingUnitPrice === 'number' && workpiece.billingUnitPrice >= 0
      ? billingQuantityPerUnit * workpiece.billingUnitPrice * workpiece.quantity
      : undefined;

  return {
    costPrice,
    standardPrice,
    highMarginPrice,
    unitBasedPrice,
    billingQuantityPerUnit,
    tiers: {
      cost: buildTierResult(costPrice, costPrice),
      standard: buildTierResult(standardPrice, costPrice),
      high_margin: buildTierResult(highMarginPrice, costPrice),
      unit_price: unitBasedPrice !== undefined ? buildTierResult(unitBasedPrice, costPrice) : undefined,
    },
  };
}
