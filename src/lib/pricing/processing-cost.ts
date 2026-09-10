import { WorkpieceInput, RateSnapshot, PricingConfigSnapshot } from './types';

export interface HangOccupancySuggestion {
  /** 這件工件依長度會佔掉幾個掛勾位 */
  hookSlotsPerPiece: number;
  /** 因此每支吊盤掛得下幾件（即建議的掛件數） */
  piecesPerRack: number;
  /** 計算時採用的設定值，供 UI 說明算式用 */
  hookSlotLengthCm: number;
  hooksPerRack: number;
}

/**
 * 依工件長度建議「每盤可掛件數」。
 *
 * 長件不能直立吊掛、必須橫掛，長度愈長就佔掉愈多掛勾位；一支吊盤的掛勾數是固定的，
 * 因此長件會把整盤的可掛件數壓下來 —— 例如 4 勾的吊盤遇到佔 4 個勾位的長鐵件，
 * 一盤就只掛得下 1 件。件數變少 → 批次數變多 → 工時與分攤的產線成本跟著上升，
 * 這就是長件單價必須拉高的成本依據。
 *
 * 兩個設定值（每勾位長度、每盤掛勾數）任一未設定就回傳 undefined，
 * 由使用者自行填寫掛件數，不臆測數字。
 */
export function suggestHangOccupancy(
  longestEdgeCm: number,
  coeffs: Pick<PricingConfigSnapshot, 'hookSlotLengthCm' | 'hooksPerRack'>,
): HangOccupancySuggestion | undefined {
  const { hookSlotLengthCm, hooksPerRack } = coeffs;
  if (!hookSlotLengthCm || !hooksPerRack || !longestEdgeCm) return undefined;

  const hookSlotsPerPiece = Math.max(1, Math.ceil(longestEdgeCm / hookSlotLengthCm));
  const piecesPerRack = Math.max(1, Math.floor(hooksPerRack / hookSlotsPerPiece));

  return { hookSlotsPerPiece, piecesPerRack, hookSlotLengthCm, hooksPerRack };
}

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
