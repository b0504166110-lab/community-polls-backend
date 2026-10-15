import type { Poll, PollOption, Prisma } from '@prisma/client';
import { CATEGORY_LABELS } from '../constants/categories';
import type { AuthUser } from '../types/express';

// כללי המצב של סקר - מרוכזים במקום אחד כדי שכל השרת יחשב אותם באותה צורה

type PollState = Pick<Poll, 'status' | 'isHidden' | 'closedEarlyAt' | 'closesAt' | 'creatorId'>;

export function isPubliclyVisible(poll: PollState): boolean {
  return poll.status === 'APPROVED' && !poll.isHidden;
}

// פתוח להצבעה: מאושר, לא מוסתר, לא נסגר מוקדם, ותאריך הסגירה עוד לא הגיע
export function isOpen(poll: PollState, now = new Date()): boolean {
  return isPubliclyVisible(poll) && poll.closedEarlyAt === null && poll.closesAt > now;
}

export function isOwner(poll: PollState, viewer?: AuthUser): boolean {
  return !!viewer && viewer.id === poll.creatorId;
}

// סקר לא מאושר/מוסתר נראה רק ליוצר ולמנהל
export function canView(poll: PollState, viewer?: AuthUser): boolean {
  return isPubliclyVisible(poll) || isOwner(poll, viewer) || viewer?.role === 'ADMIN';
}

export function isEditable(poll: PollState): boolean {
  return poll.status === 'PENDING' || poll.status === 'REJECTED';
}

// מה לטעון מהמסד עבור כל סקר. אם יש צופה מחובר - טוענים גם את ההצבעה שלו
export function pollInclude(viewerId?: number) {
  return {
    creator: { select: { id: true, name: true } },
    _count: { select: { votes: true, options: true } },
    // לאורח (בלי viewerId) מזהה 0 לא תואם אף משתמש - כלומר לא נטענת שום הצבעה
    votes: {
      where: { userId: viewerId ?? 0 },
      select: { id: true, choices: { select: { optionId: true } } },
    },
  } satisfies Prisma.PollInclude;
}

export type PollWithMeta = Poll & {
  creator: { id: number; name: string };
  _count: { votes: number; options: number };
  votes?: { id: number; choices: { optionId: number }[] }[];
};

export function toPollSummary(poll: PollWithMeta, viewer?: AuthUser) {
  const privileged = isOwner(poll, viewer) || viewer?.role === 'ADMIN';
  const myVote = poll.votes?.[0];

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    category: poll.category,
    categoryLabel: CATEGORY_LABELS[poll.category],
    allowMultiple: poll.allowMultiple,
    closesAt: poll.closesAt,
    closedEarlyAt: poll.closedEarlyAt,
    status: poll.status,
    isHidden: poll.isHidden,
    isOpen: isOpen(poll),
    // סיבת הדחייה גלויה רק ליוצר הסקר ולמנהל
    rejectionReason: privileged ? poll.rejectionReason : null,
    voterCount: poll._count.votes,
    optionCount: poll._count.options,
    creator: poll.creator,
    hasVoted: !!myVote,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
  };
}

export function toPollDetails(poll: PollWithMeta & { options: PollOption[] }, viewer?: AuthUser) {
  const summary = toPollSummary(poll, viewer);
  const owner = isOwner(poll, viewer);
  const open = summary.isOpen;

  return {
    ...summary,
    options: poll.options
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, text: o.text, position: o.position })),
    // הבחירות של הצופה עצמו בלבד - אף פעם לא של משתמשים אחרים
    myChoices: poll.votes?.[0]?.choices.map((c) => c.optionId) ?? [],
    permissions: {
      canVote: !!viewer && open && !summary.hasVoted,
      canSeeResults: !!viewer && poll.status === 'APPROVED' && (summary.hasVoted || !open),
      canEdit: owner && isEditable(poll),
      canDelete: owner && isEditable(poll),
      canClose: owner && open,
    },
  };
}
