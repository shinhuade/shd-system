import { WorkpieceInput, PricingConfigSnapshot, BillingUnit } from './types';
import {
  computeTotalAreaCm2,
  computeCaiCount,
  computeChiCount,
  buildFormulaCode,
  resolveBillingUnit,
  FaceCounts,
} from './area-formula';

export interface MaterialUsageResult {
  materialUsageKg: number;
  billingUnit: BillingUnit;
  billingWidthCm: number;
  longestEdgeCm: number;
  totalAreaCm2: number;
  caiCount: number;
  chiCount: number;
  formulaCode: string;
}

/**
 * 估算單一批次（含全部數量）的理論粉料用量（kg），以及對應的計價單位計算（Layer 1 結果）。
 * 若使用者已直接輸入 overrideMaterialUsageKg，優先採用。
 *
 * 先判定計價單位（才／尺互斥）：
 * - 走「才」：總噴塗面積(cm²) = (L×W×A)+(L×H×B)+(W×H×C)，才數 = 總面積 ÷ 900，
 *   1 才本身就是雙面才的計價單位，不再額外 ×2（見公司內部定義）。
 *   粉料用量 = 面積(m²) × 膜厚 × 粉料用量係數 ÷ 轉移效率，係數皆來自 SystemSettings，不可寫死。
 * - 走「尺」：尺是長度單位，不存在面積，因此面積與才數一律為 0、面數公式不適用，
 *   粉料用量無從估算，只能採用使用者手動輸入的 overrideMaterialUsageKg（未填即為 0）。
 */
export function estimateMaterialUsage(
  workpiece: WorkpieceInput,
  coeffs: Pick<PricingConfigSnapshot, 'powderUsageGramPerM2PerMicron' | 'transferEfficiencyPercent'>,
): MaterialUsageResult {
  const { billingUnit, billingWidthCm, longestEdgeCm } = resolveBillingUnit(workpiece.dimensions);
  const overrideKg =
    typeof workpiece.overrideMaterialUsageKg === 'number' && workpiece.overrideMaterialUsageKg >= 0
      ? workpiece.overrideMaterialUsageKg
      : undefined;

  if (billingUnit === 'chi') {
    return {
      materialUsageKg: overrideKg ?? 0,
      billingUnit,
      billingWidthCm,
      longestEdgeCm,
      totalAreaCm2: 0,
      caiCount: 0,
      chiCount: computeChiCount(longestEdgeCm),
      formulaCode: '',
    };
  }

  const faces: FaceCounts = {
    lwFaces: workpiece.lwFaces ?? 0,
    lhFaces: workpiece.lhFaces ?? 0,
    whFaces: workpiece.whFaces ?? 0,
  };
  const totalAreaCm2 = computeTotalAreaCm2(workpiece.dimensions, faces);
  const caiCount = computeCaiCount(totalAreaCm2);
  const formulaCode = buildFormulaCode(faces);
  const caiResult = { billingUnit, billingWidthCm, longestEdgeCm, totalAreaCm2, caiCount, chiCount: 0, formulaCode };

  if (overrideKg !== undefined) {
    return { materialUsageKg: overrideKg, ...caiResult };
  }

  const surfaceAreaM2PerUnit = totalAreaCm2 / 10000;
  const filmThicknessUm = workpiece.estimatedFilmThicknessUm ?? 0;
  const transferEfficiency = (coeffs.transferEfficiencyPercent || 100) / 100;

  if (!surfaceAreaM2PerUnit || !filmThicknessUm || !transferEfficiency) {
    return { materialUsageKg: 0, ...caiResult };
  }

  const usageGramPerUnit =
    (surfaceAreaM2PerUnit * filmThicknessUm * coeffs.powderUsageGramPerM2PerMicron) / transferEfficiency;
  const usageKgPerUnit = usageGramPerUnit / 1000;

  return { materialUsageKg: usageKgPerUnit * workpiece.quantity, ...caiResult };
}

/**
 * 五、粉料成本計算：實際成本 = 理論用量 × (1 + 損耗率%) × 粉料單價
 */
export function computeMaterialCost(usageKg: number, pricePerKg: number, lossRatePercent: number): number {
  return usageKg * (1 + lossRatePercent / 100) * pricePerKg;
}
