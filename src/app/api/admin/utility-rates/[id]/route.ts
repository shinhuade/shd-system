import UtilityRate from '@/models/utility-rate';
import UtilityRateHistory from '@/models/utility-rate-history';
import { createBaseItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, PATCH, DELETE } = createBaseItemHandlers(
  UtilityRate,
  ['currentUnitPrice', 'lastEffectiveDate'],
  { HistoryModel: UtilityRateHistory, parentIdField: 'utilityRateId' },
);
