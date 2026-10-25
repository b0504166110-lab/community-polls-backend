# מסמך אפיון מאושר - "סקרים בקהילה"

## א. תיאור הפרויקט
**מטרה:** אתר שבו חברי קבוצה/קהילה יוצרים סקרים, מצביעים ורואים תוצאות בדיאגרמות. מנהל מאשר כל סקר לפני פרסום.

| משתמש | תיאור |
|---|---|
| אורח | רואה רשימת סקרים מאושרים ופרטי סקר |
| משתמש (USER) | נרשם בעצמו; יוצר סקרים, מצביע, רואה תוצאות |
| מנהל (ADMIN) | נוצר מראש בשרת; כל מה שמשתמש עושה + אישור / דחייה / הסתרה |

**כללים:**
- סקר של משתמש מתחיל כ"ממתין לאישור"; סקר של מנהל מאושר אוטומטית.
- הצבעה סופית ואנונימית. כל משתמש רואה רק את הבחירה שלו.
- תוצאות - רק אחרי הצבעה או אחרי סגירת הסקר (לכולם, כולל מנהל).
- עריכה ומחיקה - רק לפני אישור; עריכת סקר שנדחה מחזירה אותו לאישור.
- אחרי אישור - רק סגירה מוקדמת, הסקר לא נמחק. מנהל יכול להסתיר סקר לא הולם.
- סקר **פתוח** = מאושר + לא מוסתר + לא נסגר מוקדם + תאריך הסגירה לא עבר.

## ב. מסכים
1. התחברות · 2. הרשמה · 3. רשימת סקרים (חיפוש, סינון, מיון, עמודים) · 4. פרטי סקר (הצבעה + דיאגרמה) ·
5. יצירת סקר · 6. עריכת סקר · 7. הסקרים שלי · 8. ניהול - ממתינים · 9. ניהול - כל הסקרים

## ג. הרשאות

| פעולה | אורח | משתמש | מנהל |
|---|---|---|---|
| רשימה ופרטי סקרים מאושרים | ✅ | ✅ | ✅ |
| יצירת סקר | 401 | ✅ ממתין | ✅ מאושר |
| עריכה/מחיקה של סקר שלי לפני אישור | 401 | ✅ | ✅ |
| עריכה/מחיקה/סגירה של סקר של אחר | 401 | 403 | 403 |
| סגירה מוקדמת של סקר שלי | 401 | ✅ | ✅ |
| הצבעה | 401 | ✅ | ✅ |
| תוצאות (אחרי הצבעה/סגירה) | 401 | ✅ | ✅ |
| צפייה בסקר לא מאושר של אחר | 404 | 404 | ✅ |
| אישור / דחייה / הסתרה | 401 | 403 | ✅ |

## ד. מסד נתונים

| טבלה | שדות עיקריים | מפתחות ואילוצים |
|---|---|---|
| `User` | id, name (2-50), email, passwordHash, role (USER/ADMIN), createdAt | PK id · email ייחודי ובאותיות קטנות |
| `Poll` | id, title (5-150), description? (≤500), category, closesAt, status, rejectionReason? (≤300), isHidden, closedEarlyAt?, creatorId, createdAt, updatedAt | PK id · FK creatorId→User · סיבת דחייה רק כש-REJECTED · הסתרה רק כש-APPROVED |
| `PollQuestion` | id, pollId, text (2-150), allowMultiple, position (1-10) | PK id · FK pollId→Poll (מחיקה מדורגת) · ייחודי (pollId, position) |
| `PollOption` | id, questionId, text (1-100), position (1-6) | PK id · FK questionId→PollQuestion (מחיקה מדורגת) · ייחודי (questionId, position) ו-(questionId, text) |
| `Vote` | id, pollId, userId, createdAt | PK id · FK→Poll, FK→User · **ייחודי (pollId, userId)** - מונע הצבעה כפולה |
| `VoteChoice` | id, voteId, optionId | PK id · FK→Vote (מדורג), FK→PollOption · ייחודי (voteId, optionId) |

**קשרים:** User 1-* Poll · Poll 1-* PollQuestion · PollQuestion 1-* PollOption · Poll 1-* Vote · User 1-* Vote · Vote 1-* VoteChoice *-1 PollOption

## ה. Endpoints
ראי [FRONTEND-API-GUIDE.md](../FRONTEND-API-GUIDE.md) ו-Swagger (`/api-docs`) - 17 Endpoints:
health, categories · auth: register, login, me · polls: list, get, create, update, delete, close, vote, results ·
admin: list, approve, reject, visibility.

## ו. התאמה לדרישות החובה

| דרישה | מימוש |
|---|---|
| התחברות | register / login / me עם JWT |
| שני סוגי משתמשים | USER, ADMIN |
| אובייקט מרכזי עם 5+ שדות | Poll: כותרת, תיאור, קטגוריה, תאריך סגירה, בחירה מרובה, סטטוס |
| רשימה / הוספה / עריכה | GET / POST / PUT ‎/api/polls |
| שדה בחירה | קטגוריה, סטטוס |
| חיפוש, סינון, מיון | search · category, state, mine, voted · newest, popular, closingSoon |
| מסד נתונים אמיתי | PostgreSQL + Prisma Migrations |
