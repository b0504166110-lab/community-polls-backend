import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// הגבלת ניסיונות התחברות/הרשמה כדי להקשות על ניחוש סיסמאות
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'יותר מדי ניסיונות - נסי שוב בעוד כמה דקות' },
  },
});
