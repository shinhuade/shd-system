import FixedCost from '@/models/fixed-cost';
import FixedCostHistory from '@/models/fixed-cost-history';
import { createPriceHistoryItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { PATCH, DELETE } = createPriceHistoryItemHandlers({
  ParentModel: FixedCost,
  HistoryModel: FixedCostHistory,
  parentIdField: 'fixedCostId',
  editableFields: ['monthlyAmount', 'effectiveDate', 'note'],
  cacheFieldMap: { monthlyAmount: 'currentMonthlyAmount' },
});
