import { PrismaClient } from '@prisma/client';

// חיבור יחיד למסד הנתונים שמשותף לכל השרת
export const prisma = new PrismaClient();
