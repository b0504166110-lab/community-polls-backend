import { z } from 'zod';
import './zodHebrew';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'כתובת האימייל ארוכה מדי')
  .email('כתובת אימייל לא תקינה');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'השם חייב להכיל לפחות 2 תווים').max(50, 'השם יכול להכיל עד 50 תווים'),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
    .max(72, 'הסיסמה יכולה להכיל עד 72 תווים')
    .regex(/[A-Za-z]/, 'הסיסמה חייבת להכיל לפחות אות אחת באנגלית')
    .regex(/\d/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'יש להזין סיסמה').max(72, 'סיסמה לא תקינה'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
