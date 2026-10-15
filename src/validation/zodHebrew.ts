import { z, ZodIssueCode, type ZodErrorMap } from 'zod';

// הודעות שגיאה בעברית לשגיאות הנפוצות שאין להן הודעה מותאמת בסכמות
const hebrewErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'שדה חובה' };
      return { message: `סוג ערך לא תקין (נדרש ${issue.expected})` };
    case ZodIssueCode.invalid_enum_value:
      return { message: `ערך לא תקין. ערכים אפשריים: ${issue.options.join(', ')}` };
    case ZodIssueCode.unrecognized_keys:
      return { message: `שדות לא מוכרים: ${issue.keys.join(', ')}` };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(hebrewErrorMap);
