import PackagingItem from '@/models/packaging-item';
import PackagingPriceHistory from '@/models/packaging-price-history';
import { createPriceHistoryItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { PATCH, DELETE } = createPriceHistoryItemHandlers({
  ParentModel: PackagingItem,
  HistoryModel: PackagingPriceHistory,
  parentIdField: 'packagingId',
  editableFields: ['unitPrice', 'effectiveDate', 'note'],
  cacheFieldMap: { unitPrice: 'currentUnitPrice' },
});
