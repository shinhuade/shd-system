import { loadRateContext } from './rates-loader';
import { buildCostBreakdown, buildQuoteSuggestion } from './quote-engine';
import { WorkpieceInput, CostBreakdown, QuoteSuggestion, RateSnapshot, PricingConfigSnapshot } from './types';

export interface CalculateQuoteItemResult {
  breakdown: CostBreakdown;
  suggestion: QuoteSuggestion;
  processingParamsId: string;
  pricingConfigId: string;
  rates: RateSnapshot;
  config: PricingConfigSnapshot;
}

/** 串接「讀取目前費率」與「純計算引擎」，供 /api/admin/quotes/calculate 與 /api/admin/quotes 共用 */
export async function calculateQuoteItem(
  materialId: string,
  packagingId: string | undefined,
  workpiece: WorkpieceInput,
): Promise<CalculateQuoteItemResult> {
  const { rates, config, processingParamsId, pricingConfigId } = await loadRateContext(materialId, packagingId);
  const breakdown = buildCostBreakdown(workpiece, rates, config);
  const suggestion = buildQuoteSuggestion(breakdown, config);

  return { breakdown, suggestion, processingParamsId, pricingConfigId, rates, config };
}

export function resolveChosenPrice(
  suggestion: QuoteSuggestion,
  chosenTier: 'cost' | 'standard' | 'high_margin' | 'custom',
  customPrice?: number,
) {
  if (chosenTier === 'custom') {
    const price = customPrice ?? suggestion.standardPrice;
    const marginAmount = price - suggestion.costPrice;
    const marginRatePercent = price > 0 ? (marginAmount / price) * 100 : 0;
    const markupRatePercent = suggestion.costPrice > 0 ? (marginAmount / suggestion.costPrice) * 100 : 0;
    return { price, marginAmount, marginRatePercent, markupRatePercent };
  }
  return suggestion.tiers[chosenTier];
}
