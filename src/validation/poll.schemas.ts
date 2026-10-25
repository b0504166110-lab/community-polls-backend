import { z } from 'zod';
import './zodHebrew';
import { CATEGORY_VALUES } from '../constants/categories';
import { booleanQuery, paginationSchema, searchSchema } from './common.schemas';

const MAX_DAYS_AHEAD = 365;

const categorySchema = z.enum(CATEGORY_VALUES, {
  errorMap: () => ({ message: `קטגוריה לא תקינה. ערכים אפשריים: ${CATEGORY_VALUES.join(', ')}` }),
});

export const MAX_QUESTIONS = 10;
export const MAX_OPTIONS = 6;

const questionSchema = z.object({
  text: z.string().trim().min(2, 'השאלה חייבת להכיל לפחות 2 תווים').max(150, 'השאלה יכולה להכיל עד 150 תווים'),
  allowMultiple: z.boolean({ invalid_type_error: 'allowMultiple חייב להיות true או false' }).default(false),
  options: z
    .array(z.string().trim().min(1, 'אפשרות תשובה לא יכולה להיות ריקה').max(100, 'אפשרות תשובה יכולה להכיל עד 100 תווים'), {
      invalid_type_error: 'options חייב להיות מערך של טקסטים',
    })
    .min(2, 'יש להזין לפחות 2 אפשרויות תשובה')
    .max(MAX_OPTIONS, `אפשר להזין עד ${MAX_OPTIONS} אפשרויות תשובה`)
    .refine(
      (options) => new Set(options.map((o) => o.toLowerCase())).size === options.length,
      'אסור שתהיינה שתי אפשרויות תשובה זהות',
    ),
});

// יצירה ועריכה של סקר משתמשות באותה סכמה
export const pollInputSchema = z.object({
  title: z.string().trim().min(5, 'הכותרת חייבת להכיל לפחות 5 תווים').max(150, 'הכותרת יכולה להכיל עד 150 תווים'),
  description: z
    .string()
    .trim()
    .max(500, 'התיאור יכול להכיל עד 500 תווים')
    .nullish()
    .transform((value) => (value ? value : null)),
  category: categorySchema,
  closesAt: z
    .string()
    .datetime({ offset: true, message: 'תאריך סגירה לא תקין - יש לשלוח תאריך בפורמט ISO, לדוגמה 2026-12-31T20:00:00.000Z' })
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() > Date.now(), 'תאריך הסגירה חייב להיות בעתיד')
    .refine(
      (date) => date.getTime() <= Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000,
      'תאריך הסגירה יכול להיות עד שנה מהיום',
    ),
  questions: z
    .array(questionSchema, { invalid_type_error: 'questions חייב להיות מערך של שאלות' })
    .min(1, 'יש להזין לפחות שאלה אחת')
    .max(MAX_QUESTIONS, `אפשר להזין עד ${MAX_QUESTIONS} שאלות בסקר`),
});

export const listPollsQuerySchema = z.object({
  search: searchSchema,
  category: categorySchema.optional(),
  state: z.enum(['open', 'closed'], { errorMap: () => ({ message: 'state חייב להיות open או closed' }) }).optional(),
  mine: booleanQuery.optional(),
  voted: booleanQuery.optional(),
  sort: z
    .enum(['newest', 'popular', 'closingSoon'], {
      errorMap: () => ({ message: 'sort חייב להיות newest, popular או closingSoon' }),
    })
    .default('newest'),
  ...paginationSchema,
});

export const voteSchema = z.object({
  optionIds: z
    .array(z.number({ invalid_type_error: 'מזהה אפשרות חייב להיות מספר' }).int().positive(), {
      invalid_type_error: 'optionIds חייב להיות מערך של מזהים',
    })
    .min(1, 'יש לבחור לפחות אפשרות אחת')
    .max(MAX_QUESTIONS * MAX_OPTIONS, 'נבחרו יותר מדי אפשרויות')
    .refine((ids) => new Set(ids).size === ids.length, 'אסור לבחור את אותה אפשרות פעמיים'),
});

export type PollInput = z.infer<typeof pollInputSchema>;
export type ListPollsQuery = z.infer<typeof listPollsQuerySchema>;
export type VoteInput = z.infer<typeof voteSchema>;
