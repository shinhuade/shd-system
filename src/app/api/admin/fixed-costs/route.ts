import FixedCost from '@/models/fixed-cost';
import { FixedCostBaseCreateSchema } from '@/models/schemas/fixed-cost';
import { createBaseResourceHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createBaseResourceHandlers(FixedCost, FixedCostBaseCreateSchema);
