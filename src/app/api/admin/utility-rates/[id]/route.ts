import UtilityRate from '@/models/utility-rate';
import { createBaseItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, PATCH, DELETE } = createBaseItemHandlers(UtilityRate, ['currentUnitPrice', 'lastEffectiveDate']);
