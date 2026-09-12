/**
 * 瓦斯成本計算引擎（純計算，不接觸資料庫）。
 *
 * 本廠同時使用兩種瓦斯，計價方式完全不同，因此分開計算後再合計：
 *
 * 1. 天然氣（管線供氣，以立方公尺計）
 *    瓦斯費 = 供氣量 × 單價 × (平均熱值 ÷ 基準熱值)
 *    例：4401 m³ × $15.1622 × (9002 ÷ 8900) = $67,494
 *
 *    熱值調整是天然氣帳單的標準作法：實際供氣的熱值每個月都會浮動，
 *    帳單上的單價是以「基準熱值」為準，因此要乘上當月平均熱值與基準熱值的比值，
 *    使用者才付到實際拿到的熱量。基準熱值 8900 kcal/m³ 是台灣天然氣的固定基準，
 *    平均熱值則是每月帳單上的數字，必須逐月輸入，不可寫死也不可沿用上個月。
 *
 * 2. 桶裝瓦斯（液化石油氣，以公斤計）
 *    瓦斯費 = 用量(kg) × 單價(元/kg)
 *    桶裝瓦斯按重量計價，沒有熱值調整。
 */

/** 天然氣基準熱值 (kcal/m³)。台灣天然氣計價的固定基準，不是可調參數。 */
export const NATURAL_GAS_BASE_HEATING_VALUE = 8900;

export interface NaturalGasInput {
  /** 當月供氣量 (m³)，來自瓦斯帳單 */
  supplyVolumeM3: number;
  /** 單價 (元/m³)，來自「水電瓦斯 → 天然氣」的當期牌價 */
  unitPricePerM3: number;
  /** 當月平均熱值 (kcal/m³)，來自當月帳單 */
  avgHeatingValueKcal?: number;
  /** 基準熱值 (kcal/m³)，預設 8900 */
  baseHeatingValueKcal?: number;
}

export interface NaturalGasResult {
  /** 熱值調整前的金額 = 供氣量 × 單價 */
  rawAmount: number;
  /** 熱值調整係數 = 平均熱值 ÷ 基準熱值 */
  heatingValueFactor: number;
  /** 熱值調整增減的金額（正數代表比基準熱值高、要多付） */
  heatingValueAdjustment: number;
  /** 調整後的實際瓦斯費 */
  amount: number;
  avgHeatingValueKcal: number;
  baseHeatingValueKcal: number;
  /** 未填平均熱值時的說明，有填時為 undefined */
  heatingValueNote?: string;
}

/**
 * 熱值調整係數 = 平均熱值 ÷ 基準熱值。
 *
 * 平均熱值未填或基準熱值為 0 時回傳 1（等於不調整）而非猜測一個數字：
 * 少乘一個係數只是少了修正，硬套上個月的熱值卻會算出一筆對不上帳單的金額。
 */
export function computeHeatingValueFactor(
  avgHeatingValueKcal?: number,
  baseHeatingValueKcal: number = NATURAL_GAS_BASE_HEATING_VALUE,
): number {
  if (!avgHeatingValueKcal || !baseHeatingValueKcal) return 1;
  return avgHeatingValueKcal / baseHeatingValueKcal;
}

/** 天然氣費 = 供氣量 × 單價 × (平均熱值 ÷ 基準熱值) */
export function computeNaturalGasCost(input: NaturalGasInput): NaturalGasResult {
  const supplyVolumeM3 = input.supplyVolumeM3 || 0;
  const unitPricePerM3 = input.unitPricePerM3 || 0;
  const baseHeatingValueKcal = input.baseHeatingValueKcal || NATURAL_GAS_BASE_HEATING_VALUE;
  const avgHeatingValueKcal = input.avgHeatingValueKcal || 0;

  const rawAmount = supplyVolumeM3 * unitPricePerM3;
  const heatingValueFactor = computeHeatingValueFactor(avgHeatingValueKcal, baseHeatingValueKcal);
  const amount = rawAmount * heatingValueFactor;

  return {
    rawAmount,
    heatingValueFactor,
    heatingValueAdjustment: amount - rawAmount,
    amount,
    avgHeatingValueKcal,
    baseHeatingValueKcal,
    heatingValueNote: avgHeatingValueKcal
      ? undefined
      : `尚未填寫當月平均熱值，暫不做熱值調整（等同係數 1）。請填入帳單上的平均熱值，金額才會與帳單一致。`,
  };
}

export interface BottledGasInput {
  /** 當月用量 (kg) */
  usageKg: number;
  /** 單價 (元/kg)，來自「水電瓦斯 → 桶裝瓦斯」的當期牌價 */
  unitPricePerKg: number;
}

export interface BottledGasResult {
  amount: number;
  usageKg: number;
  unitPricePerKg: number;
}

/** 桶裝瓦斯費 = 用量(kg) × 單價(元/kg)，無熱值調整 */
export function computeBottledGasCost(input: BottledGasInput): BottledGasResult {
  const usageKg = input.usageKg || 0;
  const unitPricePerKg = input.unitPricePerKg || 0;

  return { amount: usageKg * unitPricePerKg, usageKg, unitPricePerKg };
}

export interface MonthlyGasCostInput {
  natural?: NaturalGasInput;
  bottled?: BottledGasInput;
}

export interface MonthlyGasCostResult {
  natural: NaturalGasResult;
  bottled: BottledGasResult;
  /** 兩種瓦斯合計 */
  totalAmount: number;
}

/** 當月瓦斯總成本 = 天然氣 + 桶裝瓦斯。兩者互不相關，各自可以為 0。 */
export function computeMonthlyGasCost(input: MonthlyGasCostInput): MonthlyGasCostResult {
  const natural = computeNaturalGasCost(input.natural ?? { supplyVolumeM3: 0, unitPricePerM3: 0 });
  const bottled = computeBottledGasCost(input.bottled ?? { usageKg: 0, unitPricePerKg: 0 });

  return { natural, bottled, totalAmount: natural.amount + bottled.amount };
}
