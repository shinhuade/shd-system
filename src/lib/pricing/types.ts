/**
 * 計價單位：cai = 才（面積單位，1 才 = 900 cm²），chi = 尺（長度單位，1 尺 = 30 cm）。
 * 兩者互斥，由 resolveBillingUnit() 依寬度判定，同一件工件不會同時有才數與尺數。
 */
export type BillingUnit = 'cai' | 'chi';

export interface Dimensions {
  length?: number;
  width?: number;
  height?: number;
}

export interface WorkpieceInput {
  /** 長寬高單位為公分 (cm)，才數計算以此為準 */
  dimensions?: Dimensions;
  quantity: number;
  unitWeightKg?: number;
  totalWeightKg?: number;
  estimatedFilmThicknessUm?: number;
  /**
   * 面數公式的三個方向面數（0~2），來自 WorkpieceFormulaTemplate 或自訂。
   * 未提供時視為 0（不會自行假設，避免猜測面積）。
   */
  lwFaces?: number;
  lhFaces?: number;
  whFaces?: number;
  /**
   * 若使用者直接輸入理論粉料用量(kg)，優先採用，不再用才數估算。
   * 走「尺」計價時不算面積，粉料用量只能由這裡提供，未填即為 0。
   */
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
  /**
   * 單價法報價用的「每才／每尺單價」($)。有填才會產生 unit_price 這一檔報價：
   * 報價 = 單件才數或尺數 × 單價 × 數量。成本仍照常計算，用來檢核毛利。
   */
  billingUnitPrice?: number;
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
  /**
   * 產線吊掛參數（選填）。長件必須橫掛，會依長度佔掉多個掛勾位，
   * 使每盤掛得下的件數變少、批次數變多、分攤到的產線成本上升。
   * 未設定時不做自動建議（不臆測數字），掛件數改由使用者自行填寫。
   */
  hookSlotLengthCm?: number;
  hooksPerRack?: number;
}

export interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  /** 精算報價的能源成本（電費＋瓦斯＋水費合併）；報價精靈的成本拆解不使用此欄位 */
  energyCost?: number;
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
  /** 中繼數值，供 UI 顯示、以及寫入 QuotationItem 的歷史快照用 */
  materialUsageKg: number;
  processingHours: number;
  /**
   * 計價單位判定與 Layer 1 結果快照。才與尺互斥：
   * - billingUnit = 'cai'：totalAreaCm2 / caiCount / formulaCode 有值，chiCount 為 0。
   * - billingUnit = 'chi'：chiCount 有值，totalAreaCm2 / caiCount 為 0、formulaCode 為空字串。
   */
  billingUnit: BillingUnit;
  /** 判定計價單位所用的寬度 (cm)，供 UI 說明「為什麼這件走尺」 */
  billingWidthCm: number;
  /** 最長邊 (cm)，走尺計價時的長度來源 */
  longestEdgeCm: number;
  totalAreaCm2: number;
  /** 才數（單件） */
  caiCount: number;
  /** 尺數（單件，與才數同一個位階） */
  chiCount: number;
  formulaCode: string;
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
  /** 單價法報價（單件才數／尺數 × 單價 × 數量）。未提供單價時為 undefined。 */
  unitBasedPrice?: number;
  /** 單價法所採用的計價數量（單件才數或尺數），供 UI 顯示算式 */
  billingQuantityPerUnit: number;
  tiers: {
    cost: QuoteTierResult;
    standard: QuoteTierResult;
    high_margin: QuoteTierResult;
    unit_price?: QuoteTierResult;
  };
}

export interface RequoteAlertResult {
  percentChange: number;
  marginRateIfUnchanged: number;
  suggestedNewPrice: number;
  severity: 'red' | 'orange' | 'yellow' | 'green';
  shouldRequote: boolean;
}
