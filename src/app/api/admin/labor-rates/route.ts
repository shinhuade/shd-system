import LaborRate from '@/models/labor-rate';
import { LaborRateBaseCreateSchema } from '@/models/schemas/labor-rate';
import { createBaseResourceHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createBaseResourceHandlers(LaborRate, LaborRateBaseCreateSchema);
