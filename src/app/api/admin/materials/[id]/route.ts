import Material from '@/models/material';
import MaterialPriceHistory from '@/models/material-price-history';
import { createBaseItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, PATCH, DELETE } = createBaseItemHandlers(
  Material,
  ['currentPricePerKg', 'currentLossRatePercent', 'lastEffectiveDate'],
  { HistoryModel: MaterialPriceHistory, parentIdField: 'materialId' },
);
