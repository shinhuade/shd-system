import PackagingItem from '@/models/packaging-item';
import PackagingPriceHistory from '@/models/packaging-price-history';
import { createBaseItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, PATCH, DELETE } = createBaseItemHandlers(
  PackagingItem,
  ['currentUnitPrice', 'lastEffectiveDate'],
  { HistoryModel: PackagingPriceHistory, parentIdField: 'packagingId' },
);
