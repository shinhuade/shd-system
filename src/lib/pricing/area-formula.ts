import { Dimensions, BillingUnit } from './types';

/**
 * 才數／尺數計算引擎（Layer 1：工件尺寸 → 計價單位 → 面數公式 → 噴塗面積 → 才數／尺數）。
 *
 * 本廠規則（不可自行更動，見公司內部定義）：
 * - 「才」是面積單位、「尺」是長度單位，兩者互斥，同一件工件只會走其中一種，絕不混用。
 * - 判定：寬度 < 5 cm 的細長件一律以「尺」計價；其餘以「才」計價。
 * - 1 才 = 900 cm²，且「1 才」本身就是雙面才的計價單位，不再因雙面烤漆額外 ×2。
 * - 1 尺 = 30 cm（與 1 才 = 30×30 cm 同一套台制換算）。
 * - 長寬高單位一律為「公分 (cm)」。
 *
 * 走「才」時：三個方向 L×W（前後）、L×H（左右）、W×H（上下）各自需要指定「面數」(0~2)，
 * 由公式範本（例如 222 完整箱體、221 無蓋箱體、112 洞洞板類）決定。
 * 走「尺」時：面數公式與面積完全不適用，尺數 = 最長邊 ÷ 30 × 數量。
 */
export interface FaceCounts {
  lwFaces: number;
  lhFaces: number;
  whFaces: number;
}

/** 計價單位定義在 types.ts（CostBreakdown 需要它），這裡轉出方便計算層直接引用 */
export type { BillingUnit };

export const CM2_PER_CAI = 900;
export const CM_PER_CHI = 30;
/** 寬度小於這個值（cm）的工件改以「尺」計價 */
export const CHI_WIDTH_THRESHOLD_CM = 5;

export interface BillingUnitResult {
  billingUnit: BillingUnit;
  /** 三邊中最長的一邊 (cm)，走尺計價時作為長度來源 */
  longestEdgeCm: number;
  /** 判定用的「寬度」(cm)：三邊排序後的中間值，見 resolveBillingUnit 說明 */
  billingWidthCm: number;
}

/** 取出有填且大於 0 的邊長，由大到小排序 */
function sortedEdges(dimensions: Dimensions | undefined): number[] {
  return [dimensions?.length, dimensions?.width, dimensions?.height]
    .filter((value): value is number => typeof value === 'number' && value > 0)
    .sort((a, b) => b - a);
}

/**
 * 判定這件工件走「才」還是走「尺」。
 *
 * 「寬度」不直接讀 dimensions.width，而是取三邊排序後的**中間值**，理由：
 * - 細長件（例如 200×3×1 的條料）中間值 = 3，正確判定為尺。
 * - 薄板（例如 200×100×0.5）中間值 = 100，正確判定為才；若取最小值會被厚度誤判成尺。
 * 這也和「尺數取最長邊」一致，使用者把長寬填反不會影響結果。
 *
 * 只填一邊時無法判定寬度，維持原本的才計價（此時面積本來就是 0）。
 */
export function resolveBillingUnit(dimensions: Dimensions | undefined): BillingUnitResult {
  const edges = sortedEdges(dimensions);
  const longestEdgeCm = edges[0] ?? 0;
  const billingWidthCm = edges[1] ?? 0;

  if (edges.length < 2) {
    return { billingUnit: 'cai', longestEdgeCm, billingWidthCm };
  }

  return {
    billingUnit: billingWidthCm < CHI_WIDTH_THRESHOLD_CM ? 'chi' : 'cai',
    longestEdgeCm,
    billingWidthCm,
  };
}

/** 總噴塗面積 (cm²) = (L×W×A) + (L×H×B) + (W×H×C)。僅適用於「才」計價。 */
export function computeTotalAreaCm2(dimensions: Dimensions | undefined, faces: FaceCounts): number {
  const length = dimensions?.length ?? 0;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;

  return length * width * faces.lwFaces + length * height * faces.lhFaces + width * height * faces.whFaces;
}

/** 才數 = 總面積 ÷ 900（單件） */
export function computeCaiCount(totalAreaCm2: number): number {
  return totalAreaCm2 / CM2_PER_CAI;
}

/** 尺數 = 最長邊 ÷ 30 × 數量（整批總計，與單件的才數不同，UI 需標明） */
export function computeChiCount(longestEdgeCm: number, quantity: number): number {
  return (longestEdgeCm / CM_PER_CHI) * quantity;
}

export function buildFormulaCode(faces: FaceCounts): string {
  return `${faces.lwFaces}${faces.lhFaces}${faces.whFaces}`;
}
