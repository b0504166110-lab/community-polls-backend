import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { AuthUser } from '../types/express';
import { AppError } from '../utils/AppError';
import { paginate } from '../utils/pagination';
import type { AdminListQuery } from '../validation/admin.schemas';
import { getPoll, searchWhere } from './polls.service';
import { pollInclude, toPollSummary } from './pollView';

export async function listAllPolls(query: AdminListQuery, admin: AuthUser) {
  const conditions: Prisma.PollWhereInput[] = [];
  if (query.status) conditions.push({ status: query.status });
  if (query.hidden !== undefined) conditions.push({ isHidden: query.hidden });
  const search = searchWhere(query.search);
  if (search) conditions.push(search);

  const where: Prisma.PollWhereInput = { AND: conditions };
  const [total, polls] = await prisma.$transaction([
    prisma.poll.count({ where }),
    prisma.poll.findMany({
      where,
      // ממתינים לאישור - הוותיקים קודם (תור); אחרת - החדשים קודם
      orderBy: query.status === 'PENDING' ? [{ createdAt: 'asc' }] : [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        ...pollInclude(admin.id),
        creator: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return paginate(
    polls.map((p) => ({ ...toPollSummary(p, admin), creator: p.creator })),
    total,
    query.page,
    query.limit,
  );
}

async function findPoll(id: number) {
  const poll = await prisma.poll.findUnique({ where: { id } });
  if (!poll) {
    throw AppError.notFound('הסקר לא נמצא');
  }
  return poll;
}

export async function approvePoll(id: number, admin: AuthUser) {
  const poll = await findPoll(id);
  if (poll.status === 'APPROVED') {
    throw AppError.conflict('INVALID_STATUS', 'הסקר כבר מאושר');
  }
  if (poll.closesAt <= new Date()) {
    throw AppError.conflict('POLL_EXPIRED', 'תאריך הסגירה של הסקר כבר עבר - יש לדחות אותו כדי שהיוצר יעדכן תאריך');
  }
  await prisma.poll.update({ where: { id }, data: { status: 'APPROVED', rejectionReason: null } });
  return getPoll(id, admin);
}

export async function rejectPoll(id: number, reason: string, admin: AuthUser) {
  const poll = await findPoll(id);
  if (poll.status === 'REJECTED') {
    throw AppError.conflict('INVALID_STATUS', 'הסקר כבר נדחה');
  }
  await prisma.poll.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  return getPoll(id, admin);
}

export async function setVisibility(id: number, isHidden: boolean, admin: AuthUser) {
  const poll = await findPoll(id);
  if (poll.status !== 'APPROVED') {
    throw AppError.conflict('INVALID_STATUS', 'אפשר להסתיר רק סקר שאושר');
  }
  await prisma.poll.update({ where: { id }, data: { isHidden } });
  return getPoll(id, admin);
}
