import UtilityRate from '@/models/utility-rate';
import UtilityRateHistory from '@/models/utility-rate-history';
import { createPriceHistoryItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { PATCH, DELETE } = createPriceHistoryItemHandlers({
  ParentModel: UtilityRate,
  HistoryModel: UtilityRateHistory,
  parentIdField: 'utilityRateId',
  editableFields: ['unitPrice', 'effectiveDate', 'note'],
  cacheFieldMap: { unitPrice: 'currentUnitPrice' },
});
