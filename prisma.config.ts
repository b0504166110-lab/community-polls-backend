import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// הגדרות Prisma: מיקום הסכמה, ה-Migrations והפקודה שמריצה את ה-Seed
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/seed/seed.ts',
  },
});
