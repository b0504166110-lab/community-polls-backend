import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setupEnv.ts'],
    // כל קובצי הבדיקה משתמשים באותו מסד בדיקות - מריצים אותם אחד אחרי השני
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
