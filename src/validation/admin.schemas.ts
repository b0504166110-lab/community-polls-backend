import { z } from 'zod';
import './zodHebrew';
import { booleanQuery, paginationSchema, searchSchema } from './common.schemas';

export const adminListQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED'], {
      errorMap: () => ({ message: 'status חייב להיות PENDING, APPROVED או REJECTED' }),
    })
    .optional(),
  hidden: booleanQuery.optional(),
  search: searchSchema,
  ...paginationSchema,
});

export const rejectSchema = z.object({
  reason: z
    .string({ required_error: 'חובה לציין סיבת דחייה', invalid_type_error: 'סיבת הדחייה חייבת להיות טקסט' })
    .trim()
    .min(1, 'חובה לציין סיבת דחייה')
    .max(300, 'סיבת הדחייה יכולה להכיל עד 300 תווים'),
});

export const visibilitySchema = z.object({
  isHidden: z.boolean({
    required_error: 'שדה חובה',
    invalid_type_error: 'isHidden חייב להיות true או false',
  }),
});

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
