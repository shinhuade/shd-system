import { Dimensions } from './types';

/**
 * 才數／面數計算引擎（Layer 1：工件尺寸 → 面數公式 → 噴塗面積 → 才數）。
 *
 * 本廠規則（不可自行更動，見公司內部定義）：
 * - 1 才 = 900 cm²，且「1 才」本身就是雙面才的計價單位，不再因雙面烤漆額外 ×2。
 * - 長寬高單位一律為「公分 (cm)」。
 * - 三個方向：L×W（前後）、L×H（左右）、W×H（上下），各自需要指定「面數」(0~2)，
 *   由公式範本（例如 222 完整箱體、221 無蓋箱體、112 洞洞板類）決定。
 */
export interface FaceCounts {
  lwFaces: number;
  lhFaces: number;
  whFaces: number;
}

export const CM2_PER_CAI = 900;

/** 總噴塗面積 (cm²) = (L×W×A) + (L×H×B) + (W×H×C) */
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
