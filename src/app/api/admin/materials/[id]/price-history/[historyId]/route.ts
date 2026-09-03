import Material from '@/models/material';
import MaterialPriceHistory from '@/models/material-price-history';
import { createPriceHistoryItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { PATCH, DELETE } = createPriceHistoryItemHandlers({
  ParentModel: Material,
  HistoryModel: MaterialPriceHistory,
  parentIdField: 'materialId',
  editableFields: ['pricePerKg', 'lossRatePercent', 'effectiveDate', 'note'],
  cacheFieldMap: { pricePerKg: 'currentPricePerKg', lossRatePercent: 'currentLossRatePercent' },
});
