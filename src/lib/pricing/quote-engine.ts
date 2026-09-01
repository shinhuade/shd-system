import { WorkpieceInput, RateSnapshot, PricingConfigSnapshot, CostBreakdown, QuoteSuggestion, QuoteTierResult } from './types';
import { estimateMaterialUsageKg, computeMaterialCost } from './material-cost';
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
  const materialUsageKg = estimateMaterialUsageKg(workpiece, config);
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
  };
}

function buildTierResult(price: number, costPrice: number): QuoteTierResult {
  const marginAmount = price - costPrice;
  const marginRatePercent = price > 0 ? (marginAmount / price) * 100 : 0;
  const markupRatePercent = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
  return { price, marginAmount, marginRatePercent, markupRatePercent };
}

/**
 * 七、報價建議：提供成本價 / 標準報價 / 高毛利報價三種，加成率一律來自 SystemSettings。
 * 標準報價 = 成本價 × (1 + 標準加成率%)；高毛利報價 = 成本價 × (1 + 高毛利加成率%)
 */
export function buildQuoteSuggestion(breakdown: CostBreakdown, config: PricingConfigSnapshot): QuoteSuggestion {
  const costPrice = breakdown.totalCost;
  const standardPrice = costPrice * (1 + config.standardMarkupPercent / 100);
  const highMarginPrice = costPrice * (1 + config.highMarginMarkupPercent / 100);

  return {
    costPrice,
    standardPrice,
    highMarginPrice,
    tiers: {
      cost: buildTierResult(costPrice, costPrice),
      standard: buildTierResult(standardPrice, costPrice),
      high_margin: buildTierResult(highMarginPrice, costPrice),
    },
  };
}
