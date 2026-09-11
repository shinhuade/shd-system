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
 * 走「才」時：三個方向各自需要指定「面數」，由公式代碼的三位數字依序決定：
 *     第 1 位 = 長×寬（前後）面數
 *     第 2 位 = 長×高（左右）面數
 *     第 3 位 = 寬×高（上下）面數
 *   例如 222 完整箱體、221 無蓋箱體、112 洞洞板類。
 *
 *   面數組合一律由「面數公式範本」（WorkpieceFormulaTemplate）提供，
 *   未來新增 111 / 121 / 122 / 211 / 212 / 101 等公式只要在後台新增範本即可，
 *   不需要改動這個引擎，也不可把公式寫死在 UI。
 *
 * 走「尺」時：面數公式與面積完全不適用，尺數 = 最長邊 ÷ 30。
 *
 * 才數與尺數一律是「單件」數量，兩者在成本計算裡站在同一個位階，
 * 要換算成整批時一律由呼叫端自行乘上數量，計算層不預先乘進去。
 *
 * 快速報價與精算報價共用本檔案的計算結果。
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

/**
 * 總噴塗面積 (cm²) = (長×寬×前後面數) + (長×高×左右面數) + (寬×高×上下面數)。
 * 僅適用於「才」計價。
 */
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

/** 尺數 = 最長邊 ÷ 30（單件，與才數同一個位階） */
export function computeChiCount(longestEdgeCm: number): number {
  return longestEdgeCm / CM_PER_CHI;
}

export function buildFormulaCode(faces: FaceCounts): string {
  return `${faces.lwFaces}${faces.lhFaces}${faces.whFaces}`;
}

/** 由三位數公式代碼（例如 "221"）解析出三個方向的面數，格式不符時回傳 null */
export function parseFormulaCode(code: string): FaceCounts | null {
  const trimmed = code.trim();
  if (!/^\d{3}$/.test(trimmed)) return null;
  return {
    lwFaces: Number(trimmed[0]),
    lhFaces: Number(trimmed[1]),
    whFaces: Number(trimmed[2]),
  };
}

export interface CaiCalculation extends FaceCounts, BillingUnitResult {
  totalAreaCm2: number;
  caiCount: number;
  /** 尺數（單件）。走才計價時為 0，與才數互斥。 */
  chiCount: number;
  formulaCode: string;
}

/**
 * 快速報價／精算報價共用的入口：一次判定計價單位，並算出面積、才數／尺數與公式代碼。
 *
 * 才與尺互斥，回傳值一定只有一邊有數字：
 * - 走「才」：totalAreaCm2 / caiCount / formulaCode 有值，chiCount 為 0。
 * - 走「尺」：chiCount 有值，totalAreaCm2 / caiCount 為 0、formulaCode 為空字串
 *   （尺是長度單位，面數公式與面積完全不適用）。
 *
 * 面數缺漏時視為 0（不自行假設面數，避免猜測面積）。
 */
export function calculateCai(dimensions: Dimensions | undefined, faces: Partial<FaceCounts>): CaiCalculation {
  const resolved: FaceCounts = {
    lwFaces: faces.lwFaces ?? 0,
    lhFaces: faces.lhFaces ?? 0,
    whFaces: faces.whFaces ?? 0,
  };
  const unit = resolveBillingUnit(dimensions);

  if (unit.billingUnit === 'chi') {
    return {
      ...resolved,
      ...unit,
      totalAreaCm2: 0,
      caiCount: 0,
      chiCount: computeChiCount(unit.longestEdgeCm),
      formulaCode: '',
    };
  }

  const totalAreaCm2 = computeTotalAreaCm2(dimensions, resolved);

  return {
    ...resolved,
    ...unit,
    totalAreaCm2,
    caiCount: computeCaiCount(totalAreaCm2),
    chiCount: 0,
    formulaCode: buildFormulaCode(resolved),
  };
}
