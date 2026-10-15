import type { PollCategory, PollStatus, Role } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { signToken } from '../src/utils/jwt';
import { hashPassword } from '../src/utils/password';

export const app = createApp();
export const api = () => request(app);
export { prisma };

export const PASSWORD = 'Password123';
const DAY = 24 * 60 * 60 * 1000;

// מוחק את כל הנתונים במסד הבדיקות (רק במסד הבדיקות - ראי testDatabase.ts)
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "VoteChoice", "Vote", "PollOption", "Poll", "User" RESTART IDENTITY CASCADE',
  );
}

let userCounter = 0;

export async function createUser(role: Role = 'USER', name = 'משתמשת בדיקה') {
  userCounter += 1;
  const user = await prisma.user.create({
    data: {
      name,
      email: `user${userCounter}-${Date.now()}@test.com`,
      passwordHash: await hashPassword(PASSWORD),
      role,
    },
  });
  return { user, token: signToken(user.id, user.role), auth: `Bearer ${signToken(user.id, user.role)}` };
}

export async function createPoll(
  creatorId: number,
  overrides: Partial<{
    title: string;
    description: string | null;
    category: PollCategory;
    allowMultiple: boolean;
    closesAt: Date;
    status: PollStatus;
    isHidden: boolean;
    closedEarlyAt: Date | null;
    rejectionReason: string | null;
    options: string[];
  }> = {},
) {
  const { options = ['אפשרות א', 'אפשרות ב', 'אפשרות ג'], ...data } = overrides;
  return prisma.poll.create({
    data: {
      title: 'סקר בדיקה לדוגמה',
      category: 'GENERAL',
      closesAt: new Date(Date.now() + 7 * DAY),
      status: 'APPROVED',
      ...data,
      creatorId,
      options: { create: options.map((text, i) => ({ text, position: i + 1 })) },
    },
    include: { options: { orderBy: { position: 'asc' } } },
  });
}

export function futureDate(days = 7) {
  return new Date(Date.now() + days * DAY).toISOString();
}

export function validPollBody(overrides: Record<string, unknown> = {}) {
  return {
    title: 'איזה סרט נראה בשישי?',
    description: 'נפגשים ב-20:00',
    category: 'ENTERTAINMENT',
    allowMultiple: false,
    closesAt: futureDate(),
    options: ['קומדיה', 'אקשן', 'דרמה'],
    ...overrides,
  };
}
