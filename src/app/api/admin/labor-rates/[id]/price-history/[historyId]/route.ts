import LaborRate from '@/models/labor-rate';
import LaborRateHistory from '@/models/labor-rate-history';
import { createPriceHistoryItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { PATCH, DELETE } = createPriceHistoryItemHandlers({
  ParentModel: LaborRate,
  HistoryModel: LaborRateHistory,
  parentIdField: 'laborRateId',
  editableFields: ['hourlyRate', 'effectiveDate', 'note'],
  cacheFieldMap: { hourlyRate: 'currentHourlyRate' },
});
