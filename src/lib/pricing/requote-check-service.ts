import { loadRateContext } from './rates-loader';
import { buildCostBreakdown } from './quote-engine';
import { evaluateRequoteAlert } from './requote-alert';
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
> & { _id: unknown };

/** 對單一報價明細用「今天」的最新費率重算成本，並與當初報價快照比對。 */
export async function checkQuotationItemRequote(item: QuotationItemLike): Promise<RequoteCheckResult> {
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
