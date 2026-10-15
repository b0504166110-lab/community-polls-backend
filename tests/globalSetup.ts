import { execSync } from 'node:child_process';
import { getTestDatabaseUrl } from './testDatabase';

// רץ פעם אחת לפני כל הבדיקות: מעדכן את מבנה מסד הבדיקות לפי ה-Migrations
export default function setup() {
  const url = getTestDatabaseUrl();
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
