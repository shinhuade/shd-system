import PackagingItem from '@/models/packaging-item';
import PackagingPriceHistory from '@/models/packaging-price-history';
import { PackagingPriceHistorySchema } from '@/models/schemas/packaging';
import { createPriceHistoryHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createPriceHistoryHandlers({
  ParentModel: PackagingItem,
  HistoryModel: PackagingPriceHistory,
  parentIdField: 'packagingId',
  historySchema: PackagingPriceHistorySchema,
  cacheFieldMap: { unitPrice: 'currentUnitPrice' },
});
