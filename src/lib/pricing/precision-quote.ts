import { Dimensions } from './types';
import { calculateCai, CaiCalculation, FaceCounts } from './area-formula';
import { CostModel } from './cost-model';

/**
 * 📊 精算報價引擎（純計算，不接觸資料庫）。
 *
 * 流程：尺寸 → 面數公式 → 才數 → 膜厚 → 成本模型（每才人工／能源／固定成本）
 *      → 粉體成本（面積 × 膜厚 × 密度 ÷ 利用率）→ 粉體損耗 → 實際成本
 *      → 目標毛利率 → 建議報價
 *
 * 使用者在報價畫面完全不需要輸入任何成本：人事／水電／瓦斯／租金等一律來自
 * 後台「每月成本紀錄 + 每月生產紀錄」推導出的成本模型，粉體單價來自粉體資料庫。
 */
export interface PowderParams {
  /** 粉體單價（元/kg），來自粉體資料庫當時有效的版本 */
  pricePerKg: number;
  /** 粉體損耗率(%)，粉體主檔有設定則用主檔，否則用系統預設 */
  lossRatePercent: number;
  /**
   * 粉體密度 (g/cm³)。1 m² × 1 μm = 1 cm³，因此這個值同時就是
   * 「每平方公尺每微米的理論粉體用量 (g)」，對應系統設定的 powderUsageGramPerM2PerMicron。
   */
  densityGPerCm3: number;
  /** 粉體利用率／噴塗轉移率(%) */
  transferEfficiencyPercent: number;
}

export interface PrecisionQuoteInput {
  dimensions?: Dimensions;
  faces: Partial<FaceCounts>;
  /** 膜厚 (μm) */
  filmThicknessUm: number;
  quantity?: number;
  /** 目標毛利率(%)，預設帶入系統設定的公司毛利率標準 */
  targetMarginRatePercent: number;
}

export interface PrecisionCostBreakdown {
  powderCost: number;
  powderLossCost: number;
  laborCost: number;
  energyCost: number;
  fixedCost: number;
  totalCost: number;
}

export interface PrecisionQuoteResult extends CaiCalculation {
  quantity: number;
  filmThicknessUm: number;
  /** 單件才數 = caiCount；總才數 = 單件才數 × 數量 */
  totalCaiCount: number;
  /** 單件粉體理論用量 (kg) */
  powderUsageKgPerPiece: number;
  powderUsageKg: number;
  perPiece: PrecisionCostBreakdown;
  total: PrecisionCostBreakdown;
  /** 目前成本／才 */
  costPerCai: number;
  targetMarginRatePercent: number;
  /** 建議報價（單件） */
  suggestedUnitPrice: number;
  /** 建議報價（總計） */
  suggestedPrice: number;
  suggestedPricePerCai: number;
  marginAmount: number;
  marginRatePercent: number;
  /** 使用的成本模型月份，寫進歷史報價快照 */
  costModelPeriodMonth: string;
  /**
   * 無法精算時的原因，可精算時為 undefined。
   * 目前唯一的情況是工件以「尺」計價：成本模型是以「每才成本」為基礎
   * （每月成本 ÷ 當月生產才數），細長件沒有才數也沒有噴塗面積，
   * 無法換算成本，因此不輸出任何金額，改請使用者走快速報價自行填每尺單價。
   */
  unavailableReason?: string;
}

const EMPTY_COST: PrecisionCostBreakdown = {
  powderCost: 0,
  powderLossCost: 0,
  laborCost: 0,
  energyCost: 0,
  fixedCost: 0,
  totalCost: 0,
};

/** 粉體理論用量 (kg) = 面積(m²) × 膜厚(μm) × 密度(g/cm³) ÷ 利用率 ÷ 1000 */
export function computePowderUsageKg(
  totalAreaCm2: number,
  filmThicknessUm: number,
  powder: Pick<PowderParams, 'densityGPerCm3' | 'transferEfficiencyPercent'>,
): number {
  const areaM2 = totalAreaCm2 / 10000;
  const efficiency = (powder.transferEfficiencyPercent || 0) / 100;
  if (!areaM2 || !filmThicknessUm || !efficiency || !powder.densityGPerCm3) return 0;
  return (areaM2 * filmThicknessUm * powder.densityGPerCm3) / efficiency / 1000;
}

/** 依目標毛利率反推報價：報價 = 成本 ÷ (1 − 毛利率%)。毛利率 ≥ 100% 時退回成本價。 */
export function suggestPriceByMarginRate(totalCost: number, targetMarginRatePercent: number): number {
  const denominator = 1 - (targetMarginRatePercent || 0) / 100;
  if (denominator <= 0) return totalCost;
  return totalCost / denominator;
}

export function buildPrecisionQuote(
  input: PrecisionQuoteInput,
  costModel: CostModel,
  powder: PowderParams,
): PrecisionQuoteResult {
  const cai = calculateCai(input.dimensions, input.faces);
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const filmThicknessUm = input.filmThicknessUm || 0;

  // 走「尺」的細長件沒有才數可套用每才成本模型，寧可不出數字也不輸出 0 元報價
  if (cai.billingUnit === 'chi') {
    return {
      ...cai,
      quantity,
      filmThicknessUm,
      totalCaiCount: 0,
      powderUsageKgPerPiece: 0,
      powderUsageKg: 0,
      perPiece: { ...EMPTY_COST },
      total: { ...EMPTY_COST },
      costPerCai: 0,
      targetMarginRatePercent: input.targetMarginRatePercent,
      suggestedUnitPrice: 0,
      suggestedPrice: 0,
      suggestedPricePerCai: 0,
      marginAmount: 0,
      marginRatePercent: 0,
      costModelPeriodMonth: costModel.periodMonth,
      unavailableReason:
        '這是以「尺」計價的細長件，成本模型以每才成本為基礎，無法換算每尺成本，' +
        '請改用「快速報價」自行填入每尺單價。',
    };
  }

  const powderUsageKgPerPiece = computePowderUsageKg(cai.totalAreaCm2, filmThicknessUm, powder);
  const powderCostPerPiece = powderUsageKgPerPiece * powder.pricePerKg;
  const powderLossCostPerPiece = powderCostPerPiece * ((powder.lossRatePercent || 0) / 100);

  const perPiece: PrecisionCostBreakdown = {
    powderCost: powderCostPerPiece,
    powderLossCost: powderLossCostPerPiece,
    laborCost: cai.caiCount * costModel.perCai.labor,
    energyCost: cai.caiCount * costModel.perCai.energy,
    fixedCost: cai.caiCount * costModel.perCai.fixed,
    totalCost: 0,
  };
  perPiece.totalCost =
    perPiece.powderCost + perPiece.powderLossCost + perPiece.laborCost + perPiece.energyCost + perPiece.fixedCost;

  const total: PrecisionCostBreakdown = {
    powderCost: perPiece.powderCost * quantity,
    powderLossCost: perPiece.powderLossCost * quantity,
    laborCost: perPiece.laborCost * quantity,
    energyCost: perPiece.energyCost * quantity,
    fixedCost: perPiece.fixedCost * quantity,
    totalCost: perPiece.totalCost * quantity,
  };

  const totalCaiCount = cai.caiCount * quantity;
  const costPerCai = cai.caiCount > 0 ? perPiece.totalCost / cai.caiCount : 0;

  const suggestedUnitPrice = suggestPriceByMarginRate(perPiece.totalCost, input.targetMarginRatePercent);
  const suggestedPrice = suggestedUnitPrice * quantity;
  const marginAmount = suggestedPrice - total.totalCost;
  const marginRatePercent = suggestedPrice > 0 ? (marginAmount / suggestedPrice) * 100 : 0;

  return {
    ...cai,
    quantity,
    filmThicknessUm,
    totalCaiCount,
    powderUsageKgPerPiece,
    powderUsageKg: powderUsageKgPerPiece * quantity,
    perPiece,
    total,
    costPerCai,
    targetMarginRatePercent: input.targetMarginRatePercent,
    suggestedUnitPrice,
    suggestedPrice,
    suggestedPricePerCai: cai.caiCount > 0 ? suggestedUnitPrice / cai.caiCount : 0,
    marginAmount,
    marginRatePercent,
    costModelPeriodMonth: costModel.periodMonth,
  };
}
