import LaborRate from '@/models/labor-rate';
import LaborRateHistory from '@/models/labor-rate-history';
import { LaborRateHistorySchema } from '@/models/schemas/labor-rate';
import { createPriceHistoryHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createPriceHistoryHandlers({
  ParentModel: LaborRate,
  HistoryModel: LaborRateHistory,
  parentIdField: 'laborRateId',
  historySchema: LaborRateHistorySchema,
  cacheFieldMap: { hourlyRate: 'currentHourlyRate' },
});
