import UtilityRate from '@/models/utility-rate';
import UtilityRateHistory from '@/models/utility-rate-history';
import { UtilityRateHistorySchema } from '@/models/schemas/utility-rate';
import { createPriceHistoryHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createPriceHistoryHandlers({
  ParentModel: UtilityRate,
  HistoryModel: UtilityRateHistory,
  parentIdField: 'utilityRateId',
  historySchema: UtilityRateHistorySchema,
  cacheFieldMap: { unitPrice: 'currentUnitPrice' },
});
