import { loadRateContext, getCurrentSystemSettings } from './rates-loader';
import { buildCostBreakdown } from './quote-engine';
import { evaluateRequoteAlert } from './requote-alert';
import { calculatePrecisionQuote } from './precision-quote-service';
import { WorkpieceInput, CostBreakdown, RequoteAlertResult } from './types';
import { IQuotationItem } from '@/models/quotation-item';

export interface RequoteCheckResult extends RequoteAlertResult {
  quotationItemId: string;
  quotationId: string;
  workpieceName: string;
  originalTotalCost: number;
  currentTotalCost: number;
  currentBreakdown: CostBreakdown;
}

type QuotationItemLike = Pick<
  IQuotationItem,
  | 'dimensions'
  | 'quantity'
  | 'unitWeightKg'
  | 'totalWeightKg'
  | 'estimatedFilmThicknessUm'
  | 'overrideMaterialUsageKg'
  | 'lwFaces'
  | 'lhFaces'
  | 'whFaces'
  | 'hangCount'
  | 'ovenCapacityPerBatch'
  | 'batchCount'
  | 'estimatedProcessingHours'
  | 'needsPretreatment'
  | 'needsRustProof'
  | 'needsRustRemoval'
  | 'costBreakdown'
  | 'chosenPrice'
  | 'marginRatePercent'
  | 'materialId'
  | 'packagingId'
  | 'packagingQuantity'
  | 'workpieceName'
  | 'quotationId'
> &
  Partial<Pick<IQuotationItem, 'quoteMode' | 'estimatedFilmThicknessUm'>> & { _id: unknown };

/**
 * 精算報價的重新檢查：改用「現在最新的成本模型 + 現在的粉體單價」重算同一個工件，
 * 與報價當下凍結在 costBreakdown 的成本比較。工件尺寸／面數／膜厚一律沿用報價時的快照。
 */
async function checkPrecisionItemRequote(item: QuotationItemLike): Promise<RequoteCheckResult> {
  const [{ result }, settings] = await Promise.all([
    calculatePrecisionQuote({
      materialId: String(item.materialId),
      dimensions: item.dimensions,
      faces: { lwFaces: item.lwFaces, lhFaces: item.lhFaces, whFaces: item.whFaces },
      filmThicknessUm: item.estimatedFilmThicknessUm ?? 0,
      quantity: item.quantity,
    }),
    getCurrentSystemSettings(),
  ]);

  const currentBreakdown: CostBreakdown = {
    materialCost: result.total.powderCost,
    laborCost: result.total.laborCost,
    energyCost: result.total.energyCost,
    gasCost: 0,
    electricityCost: 0,
    waterCost: 0,
    packagingCost: 0,
    pretreatmentCost: 0,
    outsourcingCost: 0,
    wastageCost: result.total.powderLossCost,
    indirectCostTotal: result.total.fixedCost,
    totalDirectCost:
      result.total.powderCost + result.total.powderLossCost + result.total.laborCost + result.total.energyCost,
    totalCost: result.total.totalCost,
    materialUsageKg: result.powderUsageKg,
    processingHours: 0,
    totalAreaCm2: result.totalAreaCm2,
    caiCount: result.caiCount,
    formulaCode: result.formulaCode,
  };

  const originalTotalCost = item.costBreakdown?.totalCost ?? 0;

  const alert = evaluateRequoteAlert(
    {
      originalTotalCost,
      originalChosenPrice: item.chosenPrice,
      originalMarginRatePercent: item.marginRatePercent,
      currentTotalCost: currentBreakdown.totalCost,
    },
    {
      reQuoteAlertThresholdPercent: settings.reQuoteAlertThresholdPercent,
      targetMarginRatePercent: settings.targetMarginRatePercent,
    },
  );

  return {
    quotationItemId: String(item._id),
    quotationId: String(item.quotationId),
    workpieceName: item.workpieceName,
    originalTotalCost,
    currentTotalCost: currentBreakdown.totalCost,
    currentBreakdown,
    ...alert,
  };
}

/** 對單一報價明細用「今天」的最新費率重算成本，並與當初報價快照比對。 */
export async function checkQuotationItemRequote(item: QuotationItemLike): Promise<RequoteCheckResult> {
  // 精算報價與報價精靈用的是不同的成本模型，必須各自用對應的引擎重算
  if (item.quoteMode === 'precision') {
    return checkPrecisionItemRequote(item);
  }

  const { rates, config } = await loadRateContext(
    String(item.materialId),
    item.packagingId ? String(item.packagingId) : undefined,
  );

  const workpiece: WorkpieceInput = {
    dimensions: item.dimensions,
    quantity: item.quantity,
    unitWeightKg: item.unitWeightKg,
    totalWeightKg: item.totalWeightKg,
    estimatedFilmThicknessUm: item.estimatedFilmThicknessUm,
    overrideMaterialUsageKg: item.overrideMaterialUsageKg,
    // 面數快照一律凍結使用當初報價時的值，即使範本之後被修改也不會影響這裡的重算
    lwFaces: item.lwFaces,
    lhFaces: item.lhFaces,
    whFaces: item.whFaces,
    hangCount: item.hangCount,
    ovenCapacityPerBatch: item.ovenCapacityPerBatch,
    batchCount: item.batchCount,
    estimatedProcessingHours: item.estimatedProcessingHours,
    needsPretreatment: item.needsPretreatment,
    needsRustProof: item.needsRustProof,
    needsRustRemoval: item.needsRustRemoval,
    pretreatmentCost: item.costBreakdown?.pretreatmentCost,
    outsourcingCost: item.costBreakdown?.outsourcingCost,
    wastageCost: item.costBreakdown?.wastageCost,
    packagingQuantity: item.packagingQuantity,
  };

  const currentBreakdown = buildCostBreakdown(workpiece, rates, config);
  const currentTotalCost = currentBreakdown.totalCost;
  const originalTotalCost = item.costBreakdown?.totalCost ?? 0;

  const alert = evaluateRequoteAlert(
    {
      originalTotalCost,
      originalChosenPrice: item.chosenPrice,
      originalMarginRatePercent: item.marginRatePercent,
      currentTotalCost,
    },
    {
      reQuoteAlertThresholdPercent: config.reQuoteAlertThresholdPercent,
      targetMarginRatePercent: config.targetMarginRatePercent,
    },
  );

  return {
    quotationItemId: String(item._id),
    quotationId: String(item.quotationId),
    workpieceName: item.workpieceName,
    originalTotalCost,
    currentTotalCost,
    currentBreakdown,
    ...alert,
  };
}
