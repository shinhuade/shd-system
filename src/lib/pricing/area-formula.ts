import { Dimensions } from './types';

/**
 * 才數計算引擎（工件尺寸 → 面數公式 → 噴塗面積 → 才數）。
 *
 * 本廠規則（不可自行更動，見公司內部定義）：
 * - 1 才 = 900 cm²，且「1 才」本身就是雙面才的計價單位，不再因雙面烤漆額外 ×2。
 * - 長寬高單位一律為「公分 (cm)」。
 * - 三個方向各自需要指定「面數」，由公式代碼的三位數字依序決定：
 *     第 1 位 = 長×寬（前後）面數
 *     第 2 位 = 長×高（左右）面數
 *     第 3 位 = 寬×高（上下）面數
 *   例如 222 完整箱體、221 無蓋箱體、112 洞洞板類。
 *
 * 面數組合一律由「面數公式範本」（WorkpieceFormulaTemplate）提供，
 * 未來新增 111 / 121 / 122 / 211 / 212 / 101 等公式只要在後台新增範本即可，
 * 不需要改動這個引擎，也不可把公式寫死在 UI。
 *
 * 快速報價與精算報價共用本檔案的計算結果。
 */
export interface FaceCounts {
  lwFaces: number;
  lhFaces: number;
  whFaces: number;
}

export const CM2_PER_CAI = 900;

/** 總噴塗面積 (cm²) = (長×寬×前後面數) + (長×高×左右面數) + (寬×高×上下面數) */
export function computeTotalAreaCm2(dimensions: Dimensions | undefined, faces: FaceCounts): number {
  const length = dimensions?.length ?? 0;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;

  return length * width * faces.lwFaces + length * height * faces.lhFaces + width * height * faces.whFaces;
}

/** 才數 = 總面積 ÷ 900 */
export function computeCaiCount(totalAreaCm2: number): number {
  return totalAreaCm2 / CM2_PER_CAI;
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

export interface CaiCalculation extends FaceCounts {
  totalAreaCm2: number;
  caiCount: number;
  formulaCode: string;
}

/**
 * 快速報價／精算報價共用的入口：一次算出面積、才數與公式代碼。
 * 面數缺漏時視為 0（不自行假設面數，避免猜測面積）。
 */
export function calculateCai(dimensions: Dimensions | undefined, faces: Partial<FaceCounts>): CaiCalculation {
  const resolved: FaceCounts = {
    lwFaces: faces.lwFaces ?? 0,
    lhFaces: faces.lhFaces ?? 0,
    whFaces: faces.whFaces ?? 0,
  };
  const totalAreaCm2 = computeTotalAreaCm2(dimensions, resolved);

  return {
    ...resolved,
    totalAreaCm2,
    caiCount: computeCaiCount(totalAreaCm2),
    formulaCode: buildFormulaCode(resolved),
  };
}
