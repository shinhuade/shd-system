import LaborRate from '@/models/labor-rate';
import LaborRateHistory from '@/models/labor-rate-history';
import { createBaseItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, PATCH, DELETE } = createBaseItemHandlers(
  LaborRate,
  ['currentHourlyRate', 'lastEffectiveDate'],
  { HistoryModel: LaborRateHistory, parentIdField: 'laborRateId' },
);
