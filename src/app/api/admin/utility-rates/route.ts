import UtilityRate from '@/models/utility-rate';
import { UtilityRateBaseCreateSchema } from '@/models/schemas/utility-rate';
import { createBaseResourceHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createBaseResourceHandlers(UtilityRate, UtilityRateBaseCreateSchema);
