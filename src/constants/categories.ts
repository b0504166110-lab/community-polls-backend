import type { PollCategory } from '@prisma/client';

// השמות בעברית של הקטגוריות - לשימוש בשדה הבחירה באתר
export const CATEGORY_LABELS: Record<PollCategory, string> = {
  ENTERTAINMENT: 'בילויים',
  FOOD: 'אוכל',
  TRIPS: 'טיולים',
  SPORT: 'ספורט',
  GENERAL: 'כללי',
};

export const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as [PollCategory, ...PollCategory[]];
