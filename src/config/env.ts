import 'dotenv/config';
import { z } from 'zod';

// בדיקת משתני הסביבה בעליית השרת - אם משהו חסר, השרת לא יעלה ויציג הודעה ברורה
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL חסר - יש להגדיר כתובת למסד הנתונים' })
    .min(1, 'DATABASE_URL חסר - יש להגדיר כתובת למסד הנתונים'),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET חסר - יש להגדיר מפתח סודי' })
    .min(32, 'JWT_SECRET חייב להכיל לפחות 32 תווים'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
}).refine((e) => !(e.NODE_ENV === 'production' && e.JWT_SECRET.startsWith('change-me')), {
  path: ['JWT_SECRET'],
  message: 'בפרודקשן אסור להשתמש בערך לדוגמה של JWT_SECRET - יש ליצור מפתח אקראי',
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ שגיאה בהגדרות הסביבה (Environment Variables):');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  corsOrigins: data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
