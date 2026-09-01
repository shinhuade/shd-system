import { Dimensions, WorkpieceInput, PricingConfigSnapshot } from './types';

/**
 * 依工件外觀尺寸估算表面積（以長方體六面估算，取近似值）。
 * 沒有足夠尺寸資料時回傳 0，交由呼叫端 fallback 到單重估算或人工輸入。
 */
export function estimateSurfaceAreaM2(dimensions?: Dimensions): number {
  const { length, width, height } = dimensions ?? {};
  if (!length || !width || !height) return 0;

  // 長寬高單位假設為 mm，換算為 m²
  const l = length / 1000;
  const w = width / 1000;
  const h = height / 1000;

  const surfaceAreaM2 = 2 * (l * w + l * h + w * h);
  return surfaceAreaM2;
}

/**
 * 估算單一批次（含全部數量）的理論粉料用量（kg）。
 * 若使用者已直接輸入 overrideMaterialUsageKg，優先採用。
 * 否則以「表面積 × 膜厚 × 粉料用量係數 ÷ 轉移效率」估算單件用量，再乘以數量。
 * powderUsageGramPerM2PerMicron / transferEfficiencyPercent 皆來自 SystemSettings，
 * 為預留給工廠未來用實際數據校正的係數，不可寫死。
 */
export function estimateMaterialUsageKg(
  workpiece: WorkpieceInput,
  coeffs: Pick<PricingConfigSnapshot, 'powderUsageGramPerM2PerMicron' | 'transferEfficiencyPercent'>,
): number {
  if (typeof workpiece.overrideMaterialUsageKg === 'number' && workpiece.overrideMaterialUsageKg >= 0) {
    return workpiece.overrideMaterialUsageKg;
  }

  const surfaceAreaM2 = estimateSurfaceAreaM2(workpiece.dimensions);
  const filmThicknessUm = workpiece.estimatedFilmThicknessUm ?? 0;
  const transferEfficiency = (coeffs.transferEfficiencyPercent || 100) / 100;

  if (!surfaceAreaM2 || !filmThicknessUm || !transferEfficiency) return 0;

  const usageGramPerUnit =
    (surfaceAreaM2 * filmThicknessUm * coeffs.powderUsageGramPerM2PerMicron) / transferEfficiency;
  const usageKgPerUnit = usageGramPerUnit / 1000;

  return usageKgPerUnit * workpiece.quantity;
}

/**
 * 五、粉料成本計算：實際成本 = 理論用量 × (1 + 損耗率%) × 粉料單價
 */
export function computeMaterialCost(usageKg: number, pricePerKg: number, lossRatePercent: number): number {
  return usageKg * (1 + lossRatePercent / 100) * pricePerKg;
}
