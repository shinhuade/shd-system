import LaborRate from '@/models/labor-rate';
import { createBaseItemHandlers } from '@/lib/api/versioned-resource-handlers';

export const { GET, PATCH, DELETE } = createBaseItemHandlers(LaborRate, ['currentHourlyRate', 'lastEffectiveDate']);
