import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { AuthUser } from '../types/express';
import { AppError } from '../utils/AppError';
import { paginate } from '../utils/pagination';
import type { ListPollsQuery, PollInput } from '../validation/poll.schemas';
import {
  canDeletePoll,
  canView,
  isEditable,
  isOpen,
  isOwner,
  pollInclude,
  questionsInclude,
  toPollDetails,
  toPollSummary,
} from './pollView';

const PUBLIC_WHERE: Prisma.PollWhereInput = { status: 'APPROVED', isHidden: false };

function openWhere(now: Date): Prisma.PollWhereInput {
  return { ...PUBLIC_WHERE, closedEarlyAt: null, closesAt: { gt: now } };
}

function closedWhere(now: Date): Prisma.PollWhereInput {
  return {
    status: 'APPROVED',
    OR: [{ isHidden: true }, { closedEarlyAt: { not: null } }, { closesAt: { lte: now } }],
  };
}

export function searchWhere(search?: string): Prisma.PollWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { questions: { some: { text: { contains: search, mode: 'insensitive' } } } },
    ],
  };
}

export async function listPolls(query: ListPollsQuery, viewer?: AuthUser) {
  if ((query.mine || query.voted) && !viewer) {
    throw AppError.unauthorized('הסינון "שלי" או "הצבעתי" דורש התחברות');
  }

  const now = new Date();
  // "נסגרים בקרוב" מתייחס לסקרים פתוחים, אלא אם ביקשו במפורש סקרים סגורים
  const state = query.state ?? (query.sort === 'closingSoon' ? 'open' : undefined);
  const conditions: Prisma.PollWhereInput[] = [];

  // "הסקרים שלי" כוללים את כל הסטטוסים. בכל מקרה אחר - רק סקרים מאושרים וגלויים
  conditions.push(query.mine && viewer ? { creatorId: viewer.id } : PUBLIC_WHERE);
  if (query.voted && viewer) conditions.push({ votes: { some: { userId: viewer.id } } });
  if (query.category) conditions.push({ category: query.category });
  if (state === 'open') conditions.push(openWhere(now));
  if (state === 'closed') conditions.push(closedWhere(now));
  const search = searchWhere(query.search);
  if (search) conditions.push(search);

  const orderBy: Prisma.PollOrderByWithRelationInput[] =
    query.sort === 'popular'
      ? [{ votes: { _count: 'desc' } }, { createdAt: 'desc' }]
      : query.sort === 'closingSoon'
        ? [{ closesAt: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

  const where: Prisma.PollWhereInput = { AND: conditions };
  const [total, polls] = await prisma.$transaction([
    prisma.poll.count({ where }),
    prisma.poll.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: pollInclude(viewer?.id),
    }),
  ]);

  return paginate(
    polls.map((p) => toPollSummary(p, viewer)),
    total,
    query.page,
    query.limit,
  );
}

// טעינת סקר עם בדיקת הרשאת צפייה. סקר שאסור לראות מוחזר כ-404 כדי לא לחשוף שהוא קיים
export async function findViewablePoll(id: number, viewer?: AuthUser) {
  const poll = await prisma.poll.findUnique({
    where: { id },
    include: { ...pollInclude(viewer?.id), questions: questionsInclude },
  });
  if (!poll || !canView(poll, viewer)) {
    throw AppError.notFound('הסקר לא נמצא');
  }
  return poll;
}

export async function getPoll(id: number, viewer?: AuthUser) {
  const poll = await findViewablePoll(id, viewer);
  return toPollDetails(poll, viewer);
}

function questionsData(questions: PollInput['questions']) {
  return questions.map((q, qIndex) => ({
    text: q.text,
    allowMultiple: q.allowMultiple,
    position: qIndex + 1,
    options: { create: q.options.map((text, index) => ({ text, position: index + 1 })) },
  }));
}

export async function createPoll(input: PollInput, user: AuthUser) {
  const poll = await prisma.poll.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      closesAt: input.closesAt,
      // סקר של מנהל מאושר אוטומטית; סקר של משתמש ממתין לאישור
      status: user.role === 'ADMIN' ? 'APPROVED' : 'PENDING',
      creatorId: user.id,
      questions: { create: questionsData(input.questions) },
    },
  });
  return getPoll(poll.id, user);
}

function requireOwner(poll: Awaited<ReturnType<typeof findViewablePoll>>, user: AuthUser) {
  if (!isOwner(poll, user)) {
    throw AppError.forbidden('רק יוצר הסקר יכול לבצע פעולה זו');
  }
}

export async function updatePoll(id: number, input: PollInput, user: AuthUser) {
  const poll = await findViewablePoll(id, user);
  requireOwner(poll, user);
  if (!isEditable(poll)) {
    throw AppError.conflict('POLL_LOCKED', 'אי אפשר לערוך סקר שכבר אושר');
  }
  if (poll._count.votes > 0) {
    throw AppError.conflict('POLL_HAS_VOTES', 'אי אפשר לערוך סקר שכבר הצביעו בו');
  }

  // לסקר שלא אושר אין הצבעות, ולכן אפשר להחליף את השאלות והאפשרויות בבטחה
  await prisma.$transaction([
    prisma.pollQuestion.deleteMany({ where: { pollId: id } }),
    prisma.poll.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        closesAt: input.closesAt,
        // אחרי עריכה הסקר חוזר לאישור המנהל
        status: 'PENDING',
        rejectionReason: null,
        questions: { create: questionsData(input.questions) },
      },
    }),
  ]);
  return getPoll(id, user);
}

export async function deletePoll(id: number, user: AuthUser) {
  const poll = await findViewablePoll(id, user);
  if (user.role !== 'ADMIN') {
    requireOwner(poll, user);
    if (!canDeletePoll(poll, poll._count.votes, user)) {
      throw AppError.conflict('POLL_HAS_VOTES', 'אי אפשר למחוק סקר שכבר הצביעו בו');
    }
  }
  // הצבעות חוסמות מחיקת סקר במסד, לכן מוחקים אותן קודם (הבחירות נמחקות איתן)
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { pollId: id } }),
    prisma.poll.delete({ where: { id } }),
  ]);
}

export async function closePoll(id: number, user: AuthUser) {
  const poll = await findViewablePoll(id, user);
  if (!isOwner(poll, user)) {
    throw AppError.forbidden('רק יוצר הסקר יכול לסגור אותו');
  }
  if (!isOpen(poll)) {
    throw AppError.conflict('POLL_NOT_OPEN', 'אפשר לסגור רק סקר מאושר שעדיין פתוח');
  }
  await prisma.poll.update({ where: { id }, data: { closedEarlyAt: new Date() } });
  return getPoll(id, user);
}
