import { WorkpieceInput, RateSnapshot } from './types';

/**
 * 包材成本 = 使用數量 × 包材單價，包材使用數量預設等於工件數量。
 */
export function computePackagingCost(workpiece: Pick<WorkpieceInput, 'quantity' | 'packagingQuantity'>, rates: Pick<RateSnapshot, 'packagingUnitPrice'>): number {
  const packagingQuantity = workpiece.packagingQuantity ?? workpiece.quantity;
  return packagingQuantity * rates.packagingUnitPrice;
}
