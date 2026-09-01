export interface Dimensions {
  length?: number;
  width?: number;
  height?: number;
}

export interface WorkpieceInput {
  dimensions?: Dimensions;
  quantity: number;
  unitWeightKg?: number;
  totalWeightKg?: number;
  estimatedFilmThicknessUm?: number;
  /** 若使用者直接輸入理論粉料用量(kg)，優先採用，不再用幾何估算 */
  overrideMaterialUsageKg?: number;
  hangCount: number;
  ovenCapacityPerBatch: number;
  batchCount: number;
  /** 若已知實際生產工時則直接使用，否則用 computeProcessingHours 估算 */
  estimatedProcessingHours?: number;
  needsPretreatment?: boolean;
  needsRustProof?: boolean;
  needsRustRemoval?: boolean;
  /** 前處理/防鏽/除鏽等特殊處理的整批成本，由管理者於報價時輸入 */
  pretreatmentCost?: number;
  /** 外包整批成本，由管理者於報價時輸入 */
  outsourcingCost?: number;
  /** 損耗成本（材料損耗以外的報廢/重工等），可直接輸入金額 */
  wastageCost?: number;
  /** 包材使用數量，預設等於 quantity */
  packagingQuantity?: number;
}

/** 報價當下用於計算的所有牌價快照，一律來自版本化的 Model，不可寫死 */
export interface RateSnapshot {
  materialPricePerKg: number;
  materialLossRatePercent: number;
  packagingUnitPrice: number;
  hourlyLaborCost: number;
  hourlyGasCost: number;
  hourlyElectricityCost: number;
  hourlyWaterCost: number;
  hourlyEquipmentCost: number;
  hourlyFactoryCost: number;
  hourlyManagementCost: number;
}

/** 系統可調參數快照（系統設定），計算引擎全部從這裡讀取係數，不可寫死 */
export interface PricingConfigSnapshot {
  defaultMaterialLossRatePercent: number;
  standardMarkupPercent: number;
  highMarginMarkupPercent: number;
  reQuoteAlertThresholdPercent: number;
  targetMarginRatePercent: number;
  powderUsageGramPerM2PerMicron: number;
  transferEfficiencyPercent: number;
  standardMonthlyOperatingHours: number;
  standardCycleHoursPerBatch: number;
}

export interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  gasCost: number;
  electricityCost: number;
  waterCost: number;
  packagingCost: number;
  pretreatmentCost: number;
  outsourcingCost: number;
  wastageCost: number;
  /** 設備/廠房/管理三項間接成本，依本張工單的加工工時分攤 */
  indirectCostTotal: number;
  totalDirectCost: number;
  totalCost: number;
  /** 中繼數值，供 UI 顯示/除錯用 */
  materialUsageKg: number;
  processingHours: number;
}

export interface QuoteTierResult {
  price: number;
  marginAmount: number;
  marginRatePercent: number;
  markupRatePercent: number;
}

export interface QuoteSuggestion {
  costPrice: number;
  standardPrice: number;
  highMarginPrice: number;
  tiers: {
    cost: QuoteTierResult;
    standard: QuoteTierResult;
    high_margin: QuoteTierResult;
  };
}

export interface RequoteAlertResult {
  percentChange: number;
  marginRateIfUnchanged: number;
  suggestedNewPrice: number;
  severity: 'red' | 'orange' | 'yellow' | 'green';
  shouldRequote: boolean;
}
