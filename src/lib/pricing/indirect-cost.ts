import { ProcessingCostResult } from './processing-cost';

/**
 * 間接成本（廠房租金/設備折舊/管理費用等）本身是每月固定總額（見 FixedCost Model），
 * 無法直接算到單一工件，因此在報價引擎中改以「每小時設備/廠房/管理成本」
 * （ProcessingCostParams）依本張工單的加工工時分攤，做為此工件應負擔的間接成本。
 */
export function computeIndirectCostAllocation(processingCost: Pick<ProcessingCostResult, 'equipmentCost' | 'factoryCost' | 'managementCost'>): number {
  return processingCost.equipmentCost + processingCost.factoryCost + processingCost.managementCost;
}
