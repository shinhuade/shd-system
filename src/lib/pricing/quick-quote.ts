import { Dimensions } from './types';
import { calculateCai, CaiCalculation, FaceCounts, CHI_WIDTH_THRESHOLD_CM } from './area-formula';

/**
 * ⚡ 快速報價引擎（純計算，不接觸資料庫）。
 *
 * 流程：尺寸 → 判定計價單位 → 才數／尺數 → 手動輸入單價 → 報價金額。
 * 這裡完全不碰成本模型，工廠人員在電話／LINE 詢價時可在數十秒內完成。
 *
 * 計價單位不由使用者選擇，而是依本廠規則從尺寸自動判定（見 area-formula）：
 * 寬度 < 5 cm 的細長件走「尺」（尺數 = 最長邊 ÷ 30），其餘走「才」（才數 = 面積 ÷ 900）。
 * 才與尺互斥，同一件工件只會有一種計價數量，單價欄位隨判定結果切換為每才或每尺。
 */
export interface QuickQuoteInput {
  dimensions?: Dimensions;
  faces: Partial<FaceCounts>;
  /** 每才單價或每尺單價，依自動判定的計價單位而定 */
  unitPrice: number;
  quantity?: number;
}

export interface QuickQuoteResult extends CaiCalculation {
  unitPrice: number;
  quantity: number;
  /** 單件的計價數量：走才是才數、走尺是尺數，即單價要乘的數量 */
  billingQuantityPerUnit: number;
  /** 單件報價金額 = 單件計價數量 × 單價 */
  unitQuotedAmount: number;
  /** 總報價金額 = 單件報價 × 數量 */
  quotedAmount: number;
  /** 無法計算時的原因（尺寸或面數不足），可計算時為 undefined */
  unavailableReason?: string;
}

export function computeQuickQuote(input: QuickQuoteInput): QuickQuoteResult {
  const cai = calculateCai(input.dimensions, input.faces);
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unitPrice = input.unitPrice ?? 0;
  const billingQuantityPerUnit = cai.billingUnit === 'chi' ? cai.chiCount : cai.caiCount;

  const base = {
    ...cai,
    unitPrice,
    quantity,
    billingQuantityPerUnit,
  };

  if (billingQuantityPerUnit <= 0) {
    return {
      ...base,
      unitQuotedAmount: 0,
      quotedAmount: 0,
      unavailableReason:
        cai.billingUnit === 'chi'
          ? `這是寬度小於 ${CHI_WIDTH_THRESHOLD_CM} cm 的細長件，以「尺」計價，請先填寫工件長度`
          : '請先填寫工件尺寸與面數，才能算出才數',
    };
  }

  const unitQuotedAmount = billingQuantityPerUnit * unitPrice;

  return {
    ...base,
    unitQuotedAmount,
    quotedAmount: unitQuotedAmount * quantity,
  };
}
