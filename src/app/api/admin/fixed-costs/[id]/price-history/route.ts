import FixedCost from '@/models/fixed-cost';
import FixedCostHistory from '@/models/fixed-cost-history';
import { FixedCostHistorySchema } from '@/models/schemas/fixed-cost';
import { createPriceHistoryHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createPriceHistoryHandlers({
  ParentModel: FixedCost,
  HistoryModel: FixedCostHistory,
  parentIdField: 'fixedCostId',
  historySchema: FixedCostHistorySchema,
  cacheFieldMap: { monthlyAmount: 'currentMonthlyAmount' },
});
