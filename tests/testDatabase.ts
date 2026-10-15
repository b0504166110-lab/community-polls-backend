import { config } from 'dotenv';

// מחזיר את כתובת מסד הבדיקות, ומסרב לעבוד אם היא חסרה או זהה למסד הרגיל
export function getTestDatabaseUrl(): string {
  config({ quiet: true });
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL חסר בקובץ .env - יש להגדיר מסד נתונים נפרד לבדיקות (ראי README)');
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL זהה ל-DATABASE_URL! הבדיקות מוחקות נתונים - חובה מסד נפרד');
  }
  return testUrl;
}
