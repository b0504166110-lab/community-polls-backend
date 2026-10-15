import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { AuthUser } from '../types/express';
import { AppError } from '../utils/AppError';
import type { VoteInput } from '../validation/poll.schemas';
import { findViewablePoll, getPoll } from './polls.service';
import { isOpen, toPollDetails } from './pollView';

export async function vote(pollId: number, input: VoteInput, user: AuthUser) {
  const poll = await findViewablePoll(pollId, user);

  if (!isOpen(poll)) {
    throw AppError.conflict('POLL_CLOSED', 'הסקר אינו פתוח להצבעה');
  }
  if (poll.votes && poll.votes.length > 0) {
    throw AppError.conflict('ALREADY_VOTED', 'כבר הצבעת בסקר הזה - הצבעה היא סופית');
  }

  const validIds = new Set(poll.options.map((o) => o.id));
  if (input.optionIds.some((id) => !validIds.has(id))) {
    throw AppError.badRequest('אחת האפשרויות שנבחרו אינה שייכת לסקר הזה');
  }
  if (!poll.allowMultiple && input.optionIds.length !== 1) {
    throw AppError.badRequest('בסקר הזה אפשר לבחור תשובה אחת בלבד');
  }

  try {
    await prisma.vote.create({
      data: {
        pollId,
        userId: user.id,
        choices: { create: input.optionIds.map((optionId) => ({ optionId })) },
      },
    });
  } catch (err) {
    // שתי בקשות הצבעה בו-זמנית: ההגבלה הייחודית במסד הנתונים חוסמת את השנייה
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('ALREADY_VOTED', 'כבר הצבעת בסקר הזה - הצבעה היא סופית');
    }
    throw err;
  }

  return getPoll(pollId, user);
}

export async function getResults(pollId: number, user: AuthUser) {
  const poll = await findViewablePoll(pollId, user);
  const details = toPollDetails(poll, user);

  if (!details.permissions.canSeeResults) {
    throw new AppError(
      403,
      'RESULTS_LOCKED',
      poll.status === 'APPROVED'
        ? 'התוצאות יוצגו אחרי שתצביעי או אחרי שהסקר ייסגר'
        : 'לסקר שלא אושר אין תוצאות',
    );
  }

  const counts = await prisma.voteChoice.groupBy({
    by: ['optionId'],
    where: { option: { pollId } },
    _count: { _all: true },
  });
  const countByOption = new Map(counts.map((c) => [c.optionId, c._count._all]));
  const totalVoters = details.voterCount;

  const options = details.options.map((o) => {
    const count = countByOption.get(o.id) ?? 0;
    return {
      id: o.id,
      text: o.text,
      count,
      // אחוז מתוך המצביעים (בבחירה מרובה הסכום יכול לעבור 100%)
      percent: totalVoters === 0 ? 0 : Math.round((count / totalVoters) * 1000) / 10,
    };
  });

  return {
    pollId: poll.id,
    title: poll.title,
    allowMultiple: poll.allowMultiple,
    isOpen: details.isOpen,
    totalVoters,
    totalChoices: options.reduce((sum, o) => sum + o.count, 0),
    options,
    myChoices: details.myChoices,
  };
}
