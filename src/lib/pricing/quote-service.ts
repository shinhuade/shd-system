import { loadRateContext } from './rates-loader';
import { buildCostBreakdown, buildQuoteSuggestion } from './quote-engine';
import { WorkpieceInput, CostBreakdown, QuoteSuggestion, RateSnapshot, PricingConfigSnapshot } from './types';
import { QuotationTier } from '@/models/schemas/quotation';

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
  const suggestion = buildQuoteSuggestion(breakdown, config, workpiece);

  return { breakdown, suggestion, processingParamsId, pricingConfigId, rates, config };
}

export function resolveChosenPrice(
  suggestion: QuoteSuggestion,
  chosenTier: QuotationTier,
  customPrice?: number,
) {
  if (chosenTier === 'custom') {
    return buildArbitraryTier(customPrice ?? suggestion.standardPrice, suggestion.costPrice);
  }
  if (chosenTier === 'unit_price') {
    // 沒填每才／每尺單價就沒有這一檔，退回標準報價而不是讓報價變成 0
    return suggestion.tiers.unit_price ?? buildArbitraryTier(suggestion.standardPrice, suggestion.costPrice);
  }
  return suggestion.tiers[chosenTier];
}

function buildArbitraryTier(price: number, costPrice: number) {
  const marginAmount = price - costPrice;
  const marginRatePercent = price > 0 ? (marginAmount / price) * 100 : 0;
  const markupRatePercent = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
  return { price, marginAmount, marginRatePercent, markupRatePercent };
}
