import Material from '@/models/material';
import MaterialPriceHistory from '@/models/material-price-history';
import { MaterialPriceHistorySchema } from '@/models/schemas/material';
import { createPriceHistoryHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createPriceHistoryHandlers({
  ParentModel: Material,
  HistoryModel: MaterialPriceHistory,
  parentIdField: 'materialId',
  historySchema: MaterialPriceHistorySchema,
  cacheFieldMap: { pricePerKg: 'currentPricePerKg', lossRatePercent: 'currentLossRatePercent' },
});
