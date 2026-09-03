import { Dimensions } from './types';
import { calculateCai, CaiCalculation, FaceCounts } from './area-formula';

/**
 * ⚡ 快速報價引擎（純計算，不接觸資料庫）。
 *
 * 流程：尺寸 → 面數公式 → 才數 → 手動輸入單價 → 報價金額。
 * 這裡完全不碰成本模型，工廠人員在電話／LINE 詢價時可在數十秒內完成。
 */
export type QuickQuoteUnitMode = 'per_cai' | 'per_foot';

export interface QuickQuoteInput {
  dimensions?: Dimensions;
  faces: Partial<FaceCounts>;
  unitMode: QuickQuoteUnitMode;
  /** 一才單價或一尺單價，依 unitMode 決定 */
  unitPrice: number;
  quantity?: number;
  /**
   * 1 尺 = 幾才。本系統原本沒有定義「尺」與「才」的換算方式，
   * 因此不做任何猜測：這個值必須由「系統設定 → 尺才換算」提供，
   * 未設定時一尺單價無法計算（unavailableReason 會說明原因）。
   */
  caiPerFoot?: number | null;
}

export interface QuickQuoteResult extends CaiCalculation {
  unitMode: QuickQuoteUnitMode;
  unitPrice: number;
  quantity: number;
  /** 一尺單價模式下換算出的尺數；一才單價模式為 undefined */
  footCount?: number;
  /** 單件報價金額 */
  unitQuotedAmount: number;
  /** 總報價金額 = 單件報價 × 數量 */
  quotedAmount: number;
  /** 換算後的每才單價，方便與其他報價比較 */
  effectivePricePerCai: number;
  /** 無法計算時的原因（例如尚未設定尺才換算），可計算時為 undefined */
  unavailableReason?: string;
}

export function computeQuickQuote(input: QuickQuoteInput): QuickQuoteResult {
  const cai = calculateCai(input.dimensions, input.faces);
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unitPrice = input.unitPrice ?? 0;

  const base = {
    ...cai,
    unitMode: input.unitMode,
    unitPrice,
    quantity,
  };

  if (input.unitMode === 'per_foot') {
    const caiPerFoot = input.caiPerFoot ?? 0;
    if (!caiPerFoot) {
      return {
        ...base,
        unitQuotedAmount: 0,
        quotedAmount: 0,
        effectivePricePerCai: 0,
        unavailableReason: '尚未設定「1 尺 = 幾才」的換算值，請先至「系統設定」填寫後再使用一尺單價',
      };
    }

    const footCount = cai.caiCount / caiPerFoot;
    const unitQuotedAmount = footCount * unitPrice;

    return {
      ...base,
      footCount,
      unitQuotedAmount,
      quotedAmount: unitQuotedAmount * quantity,
      effectivePricePerCai: cai.caiCount > 0 ? unitQuotedAmount / cai.caiCount : 0,
    };
  }

  const unitQuotedAmount = cai.caiCount * unitPrice;

  return {
    ...base,
    unitQuotedAmount,
    quotedAmount: unitQuotedAmount * quantity,
    effectivePricePerCai: unitPrice,
  };
}
