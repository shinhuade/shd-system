import { WorkpieceInput, RateSnapshot, PricingConfigSnapshot } from './types';

/**
 * 依掛件數與烤爐容量，建議此數量的工件大約需要幾個批次（供報價精靈預帶批次數用，
 * 僅為建議值，實際批次數仍以使用者輸入/確認的 batchCount 為準）。
 */
export function suggestBatchCount(quantity: number, hangCount: number, ovenCapacityPerBatch: number): number | undefined {
  if (!hangCount || !ovenCapacityPerBatch) return undefined;
  const perBatch = hangCount * ovenCapacityPerBatch;
  if (!perBatch) return undefined;
  return Math.max(1, Math.ceil(quantity / perBatch));
}

/**
 * 六、加工成本模型：預估生產工時。
 * 若已知實際/預估工時（estimatedProcessingHours）則直接採用；
 * 否則以「批次數 × 每批次標準加工工時」估算，standardCycleHoursPerBatch 為
 * SystemSettings 版本化係數，供工廠日後依實際產線數據校正。
 */
export function computeProcessingHours(
  workpiece: Pick<WorkpieceInput, 'batchCount' | 'estimatedProcessingHours'>,
  coeffs: Pick<PricingConfigSnapshot, 'standardCycleHoursPerBatch'>,
): number {
  if (typeof workpiece.estimatedProcessingHours === 'number' && workpiece.estimatedProcessingHours >= 0) {
    return workpiece.estimatedProcessingHours;
  }
  return (workpiece.batchCount || 0) * coeffs.standardCycleHoursPerBatch;
}

export interface ProcessingCostResult {
  laborCost: number;
  gasCost: number;
  electricityCost: number;
  waterCost: number;
  equipmentCost: number;
  factoryCost: number;
  managementCost: number;
}

/**
 * 每項成本 = 工時 × 對應每小時費率（費率一律來自 ProcessingCostParams 版本化 Model）
 */
export function computeProcessingCost(hours: number, rates: RateSnapshot): ProcessingCostResult {
  return {
    laborCost: hours * rates.hourlyLaborCost,
    gasCost: hours * rates.hourlyGasCost,
    electricityCost: hours * rates.hourlyElectricityCost,
    waterCost: hours * rates.hourlyWaterCost,
    equipmentCost: hours * rates.hourlyEquipmentCost,
    factoryCost: hours * rates.hourlyFactoryCost,
    managementCost: hours * rates.hourlyManagementCost,
  };
}
