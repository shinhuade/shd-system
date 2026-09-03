import PackagingItem from '@/models/packaging-item';
import { PackagingItemBaseCreateSchema } from '@/models/schemas/packaging';
import { createBaseResourceHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createBaseResourceHandlers(PackagingItem, PackagingItemBaseCreateSchema);
