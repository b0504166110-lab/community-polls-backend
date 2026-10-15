import { getTestDatabaseUrl } from './testDatabase';

// רץ לפני כל קובץ בדיקה - לפני שהשרת ו-Prisma נטענים
if (process.env.TEST_DB_ACTIVE !== '1') {
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.TEST_DB_ACTIVE = '1';
}
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.JWT_EXPIRES_IN = '1h';
