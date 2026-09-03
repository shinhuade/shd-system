import { WorkpieceInput, PricingConfigSnapshot } from './types';
import { computeTotalAreaCm2, computeCaiCount, buildFormulaCode, FaceCounts } from './area-formula';

export interface MaterialUsageResult {
  materialUsageKg: number;
  totalAreaCm2: number;
  caiCount: number;
  formulaCode: string;
}

/**
 * 估算單一批次（含全部數量）的理論粉料用量（kg），以及對應的才數計算（Layer 1 結果）。
 * 若使用者已直接輸入 overrideMaterialUsageKg，優先採用（此時才數/面積仍照公式算出，
 * 只是不參與用量計算，方便使用者對照）。
 *
 * 面積來源：本廠「才數」規則——總噴塗面積(cm²) = (L×W×A)+(L×H×B)+(W×H×C)，
 * 才數 = 總面積 ÷ 900，1 才本身就是雙面才的計價單位，不再額外 ×2（見公司內部定義）。
 * 粉料用量 = 面積(m²) × 膜厚 × 粉料用量係數 ÷ 轉移效率，係數皆來自 SystemSettings，不可寫死。
 */
export function estimateMaterialUsage(
  workpiece: WorkpieceInput,
  coeffs: Pick<PricingConfigSnapshot, 'powderUsageGramPerM2PerMicron' | 'transferEfficiencyPercent'>,
): MaterialUsageResult {
  const faces: FaceCounts = {
    lwFaces: workpiece.lwFaces ?? 0,
    lhFaces: workpiece.lhFaces ?? 0,
    whFaces: workpiece.whFaces ?? 0,
  };
  const totalAreaCm2 = computeTotalAreaCm2(workpiece.dimensions, faces);
  const caiCount = computeCaiCount(totalAreaCm2);
  const formulaCode = buildFormulaCode(faces);

  if (typeof workpiece.overrideMaterialUsageKg === 'number' && workpiece.overrideMaterialUsageKg >= 0) {
    return { materialUsageKg: workpiece.overrideMaterialUsageKg, totalAreaCm2, caiCount, formulaCode };
  }

  const surfaceAreaM2PerUnit = totalAreaCm2 / 10000;
  const filmThicknessUm = workpiece.estimatedFilmThicknessUm ?? 0;
  const transferEfficiency = (coeffs.transferEfficiencyPercent || 100) / 100;

  if (!surfaceAreaM2PerUnit || !filmThicknessUm || !transferEfficiency) {
    return { materialUsageKg: 0, totalAreaCm2, caiCount, formulaCode };
  }

  const usageGramPerUnit =
    (surfaceAreaM2PerUnit * filmThicknessUm * coeffs.powderUsageGramPerM2PerMicron) / transferEfficiency;
  const usageKgPerUnit = usageGramPerUnit / 1000;

  return { materialUsageKg: usageKgPerUnit * workpiece.quantity, totalAreaCm2, caiCount, formulaCode };
}

/**
 * 五、粉料成本計算：實際成本 = 理論用量 × (1 + 損耗率%) × 粉料單價
 */
export function computeMaterialCost(usageKg: number, pricePerKg: number, lossRatePercent: number): number {
  return usageKg * (1 + lossRatePercent / 100) * pricePerKg;
}
