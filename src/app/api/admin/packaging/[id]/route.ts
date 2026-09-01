import PackagingItem from '@/models/packaging-item';
import { createBaseItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, PATCH, DELETE } = createBaseItemHandlers(PackagingItem, ['currentUnitPrice', 'lastEffectiveDate']);
