import Material from '@/models/material';
import { MaterialBaseCreateSchema } from '@/models/schemas/material';
import { createBaseResourceHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, POST } = createBaseResourceHandlers(Material, MaterialBaseCreateSchema);
