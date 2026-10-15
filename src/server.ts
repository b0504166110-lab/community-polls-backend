import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './db/prisma';

const app = createApp();

// 0.0.0.0 - כדי שהשרת יהיה נגיש גם בתוך שירות הענן
const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`✅ השרת פועל על פורט ${env.PORT}`);
  console.log(`📘 Swagger: http://localhost:${env.PORT}/api-docs`);
  console.log(`❤️  Health:  http://localhost:${env.PORT}/api/health`);
});

// כיבוי מסודר (Render שולח SIGTERM לפני החלפת גרסה)
async function shutdown(signal: string) {
  console.log(`${signal} התקבל - סוגר את השרת...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
