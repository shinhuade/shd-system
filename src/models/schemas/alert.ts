import { z } from 'zod';

export const ALERT_TYPES = ['cost_increase', 'margin_drop', 'recommend_requote', 'cost_stable'] as const;
export const ALERT_SEVERITIES = ['red', 'orange', 'yellow', 'green'] as const;
export const ALERT_STATUSES = ['open', 'acknowledged', 'dismissed'] as const;

export const AlertSchema = z
  .object({
    type: z.enum(ALERT_TYPES),
    quotationId: z.string().optional(),
    quotationItemId: z.string().optional(),
    workpieceName: z.string().trim().optional(),
    originalTotalCost: z.number().default(0),
    currentTotalCost: z.number().default(0),
    percentChange: z.number().default(0),
    originalMarginRatePercent: z.number().default(0),
    currentMarginRateIfUnchanged: z.number().default(0),
    suggestedNewPrice: z.number().default(0),
    severity: z.enum(ALERT_SEVERITIES),
    status: z.enum(ALERT_STATUSES).default('open'),
    createdBy: z.string().optional(),
    resolvedAt: z.coerce.date().optional(),
  })
  .strict();

export type AlertInput = z.infer<typeof AlertSchema>;
