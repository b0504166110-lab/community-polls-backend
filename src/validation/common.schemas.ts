import { z } from 'zod';
import './zodHebrew';

export const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'מזהה לא תקין' })
    .int('מזהה לא תקין')
    .positive('מזהה לא תקין'),
});

// ערכי query מגיעים כטקסט - "true"/"false" הופכים לבוליאני
export const booleanQuery = z
  .enum(['true', 'false'], { errorMap: () => ({ message: 'הערך חייב להיות true או false' }) })
  .transform((value) => value === 'true');

export const paginationSchema = {
  page: z.coerce.number().int().min(1, 'מספר העמוד חייב להיות 1 ומעלה').default(1),
  limit: z.coerce.number().int().min(1, 'limit חייב להיות בין 1 ל-50').max(50, 'limit חייב להיות בין 1 ל-50').default(10),
};

export const searchSchema = z
  .string()
  .trim()
  .max(100, 'מילת החיפוש ארוכה מדי (עד 100 תווים)')
  .optional()
  .transform((value) => (value ? value : undefined));
