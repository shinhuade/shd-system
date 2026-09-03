import { RequoteAlertResult } from './types';

export interface RequoteAlertInput {
  originalTotalCost: number;
  originalChosenPrice: number;
  originalMarginRatePercent: number;
  currentTotalCost: number;
}

export interface RequoteAlertThresholds {
  /** 漲價提醒門檻(%)，來自 SystemSettings.reQuoteAlertThresholdPercent */
  reQuoteAlertThresholdPercent: number;
  /** 公司毛利率標準(%)，來自 SystemSettings.targetMarginRatePercent */
  targetMarginRatePercent: number;
}

/**
 * 十一、智慧漲價提醒：比較「當初報價成本」與「現在最新成本」。
 * - percentChange：成本變動百分比
 * - marginRateIfUnchanged：若維持原報價，以目前成本計算出的毛利率
 * - suggestedNewPrice：若要維持「原本的毛利率」，建議的新報價
 */
export function evaluateRequoteAlert(input: RequoteAlertInput, thresholds: RequoteAlertThresholds): RequoteAlertResult {
  const { originalTotalCost, originalChosenPrice, originalMarginRatePercent, currentTotalCost } = input;

  const percentChange = originalTotalCost > 0 ? ((currentTotalCost - originalTotalCost) / originalTotalCost) * 100 : 0;

  const marginRateIfUnchanged =
    originalChosenPrice > 0 ? ((originalChosenPrice - currentTotalCost) / originalChosenPrice) * 100 : 0;

  const marginRateDenominator = 1 - originalMarginRatePercent / 100;
  const suggestedNewPrice = marginRateDenominator > 0 ? currentTotalCost / marginRateDenominator : originalChosenPrice;

  const { reQuoteAlertThresholdPercent, targetMarginRatePercent } = thresholds;

  let severity: RequoteAlertResult['severity'] = 'green';
  if (percentChange >= reQuoteAlertThresholdPercent * 2) {
    severity = 'red'; // 🔴 成本異常增加
  } else if (marginRateIfUnchanged < targetMarginRatePercent) {
    severity = 'orange'; // 🟠 毛利率下降至公司標準以下
  } else if (percentChange >= reQuoteAlertThresholdPercent) {
    severity = 'yellow'; // 🟡 建議重新報價
  }

  return {
    percentChange,
    marginRateIfUnchanged,
    suggestedNewPrice,
    severity,
    shouldRequote: severity !== 'green',
  };
}
