# 📗 מדריך API לפיתוח צד ה-React

המסמך מסביר **מה** לשלוח לשרת ו**מה** חוזר, כדי שתוכלי לכתוב את ה-React בעצמך.
אין כאן קוד React. את התיעוד האינטראקטיבי המלא אפשר לראות ב-Swagger: `/api-docs`.

---

## 1. כתובת השרת (Base URL)

| סביבה | Base URL |
|---|---|
| פיתוח במחשב | `http://localhost:3000/api` |
| בענן (Render) | `https://YOUR-APP.onrender.com/api` |

💡 כדאי לשמור את ה-Base URL במשתנה סביבה של פרויקט ה-React (למשל ב-Vite: קובץ `.env` עם `VITE_API_URL=...`), כדי לעבור בין פיתוח לענן בלי לשנות קוד.

כל הבקשות והתשובות הן JSON. בבקשות עם גוף (POST/PUT/PATCH) יש לשלוח כותרת:
```
Content-Type: application/json
```

⚠️ השרת החינמי "נרדם" אחרי 15 דקות - הבקשה הראשונה יכולה לקחת עד דקה. כדאי להציג מצב טעינה.

---

## 2. התחברות (Authentication)

1. המשתמשת נרשמת (`POST /auth/register`) או מתחברת (`POST /auth/login`).
2. השרת מחזיר `token` (JWT) ואת פרטי המשתמש (`user`).
3. שומרים את ה-token בצד הלקוח (למשל ב-localStorage) ואת `user` ב-state הגלובלי.
4. בכל בקשה למסך מוגן שולחים כותרת:
   ```
   Authorization: Bearer <token>
   ```
5. בטעינת האתר מחדש - אם יש token שמור, קוראים ל-`GET /auth/me` כדי לוודא שהוא עדיין תקף ולקבל את פרטי המשתמש.
6. **תוקף ה-token: שעתיים.** אם מתקבל `401` - מוחקים את ה-token ומעבירים למסך ההתחברות.
7. התנתקות = מחיקת ה-token בצד הלקוח (אין Endpoint להתנתקות).

### איך לדעת אם המשתמש מנהל?
`user.role === "ADMIN"` → להציג תפריט ניהול. (השרת בודק הרשאות בעצמו - ההסתרה ב-React היא רק לנוחות.)

---

## 3. מבני הנתונים

### User
```json
{
  "id": 2,
  "name": "נועה כהן",
  "email": "noa@example.com",
  "role": "USER",
  "createdAt": "2026-10-01T10:00:00.000Z"
}
```

### PollSummary - סקר ברשימה
```json
{
  "id": 1,
  "title": "איזה סרט נראה בשישי?",
  "description": "נפגשים אצל דנה ב-20:00",
  "category": "ENTERTAINMENT",
  "categoryLabel": "בילויים",
  "closesAt": "2026-12-31T20:00:00.000Z",
  "closedEarlyAt": null,
  "status": "APPROVED",
  "isHidden": false,
  "isOpen": true,
  "rejectionReason": null,
  "voterCount": 3,
  "questionCount": 2,
  "creator": { "id": 2, "name": "נועה כהן" },
  "hasVoted": false,
  "createdAt": "2026-10-01T10:00:00.000Z",
  "updatedAt": "2026-10-01T10:00:00.000Z"
}
```

| שדה | משמעות |
|---|---|
| `status` | `PENDING` ממתין לאישור · `APPROVED` מאושר · `REJECTED` נדחה |
| `isOpen` | אפשר להצביע עכשיו (מאושר, לא מוסתר, לא נסגר, התאריך לא עבר) |
| `hasVoted` | המשתמשת המחוברת כבר הצביעה (לאורח תמיד `false`) |
| `rejectionReason` | סיבת דחייה - מגיעה רק ליוצרת הסקר ולמנהל |
| `closedEarlyAt` | אם לא `null` - היוצרת סגרה את הסקר מוקדם |

### PollDetails - סקר מלא (PollSummary + השדות הבאים)
```json
{
  "...": "כל השדות של PollSummary",
  "questions": [
    {
      "id": 1,
      "text": "איזה סרט נראה?",
      "allowMultiple": false,
      "position": 1,
      "options": [
        { "id": 11, "text": "קומדיה", "position": 1 },
        { "id": 12, "text": "אקשן", "position": 2 }
      ]
    },
    {
      "id": 2,
      "text": "באיזו שעה נפגשים?",
      "allowMultiple": true,
      "position": 2,
      "options": [
        { "id": 13, "text": "19:00", "position": 1 },
        { "id": 14, "text": "20:00", "position": 2 }
      ]
    }
  ],
  "myChoices": [],
  "permissions": {
    "canVote": true,
    "canSeeResults": false,
    "canEdit": false,
    "canDelete": false,
    "canClose": false
  }
}
```

- לכל סקר יש שאלה אחת או יותר (`questions`), ולכל שאלה האפשרויות שלה. `allowMultiple` שייך לשאלה, לא לסקר.
- `myChoices` - מזהי האפשרויות שבחרת, מכל השאלות יחד.

💡 **`permissions` נועד בדיוק בשבילך:** הוא אומר אילו כפתורים להציג למשתמשת הנוכחית - בלי לחשב בעצמך.

### PollResults - תוצאות לדיאגרמה
```json
{
  "pollId": 1,
  "title": "איזה סרט נראה בשישי?",
  "isOpen": true,
  "totalVoters": 3,
  "questions": [
    {
      "id": 1,
      "text": "איזה סרט נראה?",
      "allowMultiple": false,
      "totalChoices": 3,
      "options": [
        { "id": 11, "text": "קומדיה", "count": 2, "percent": 66.7 },
        { "id": 12, "text": "אקשן", "count": 1, "percent": 33.3 }
      ]
    }
  ],
  "myChoices": [11]
}
```
- התוצאות מחולקות לפי שאלה - דיאגרמה נפרדת לכל שאלה.
- `count` - כמה בחרו באפשרות; `percent` - אחוז **מתוך המצביעים**.
- בשאלה עם בחירה מרובה סכום האחוזים יכול לעבור 100% - זה תקין.
- `options` של כל שאלה מתאים ישירות לספריית דיאגרמות (עוגה / עמודות): `text` לתווית, `count` או `percent` לערך.
- `myChoices` - לסימון "הבחירה שלי" בדיאגרמה.

### רשימה עם עמודים
כל Endpoint של רשימה מחזיר:
```json
{ "items": [ ... ], "page": 1, "limit": 10, "total": 23, "totalPages": 3 }
```

### קטגוריות
| value (נשלח לשרת) | label (מוצג למשתמש) |
|---|---|
| `ENTERTAINMENT` | בילויים |
| `FOOD` | אוכל |
| `TRIPS` | טיולים |
| `SPORT` | ספורט |
| `GENERAL` | כללי |

אפשר לקבל את הרשימה מהשרת: `GET /categories`.

### תאריכים
השרת שולח ומקבל תאריכים בפורמט **ISO** בזמן UTC, למשל `2026-12-31T20:00:00.000Z`.
- בהצגה - להמיר לזמן מקומי.
- בשליחה - להמיר את הערך משדה התאריך בטופס ל-ISO (למשל עם `toISOString()`).

---

## 4. רשימת Endpoints

🔓 = ציבורי · 🔑 = דורש Token · 👑 = מנהל בלבד

| Method | URL | הרשאה | תיאור | הצלחה |
|---|---|---|---|---|
| GET | `/health` | 🔓 | בדיקת תקינות | 200 |
| GET | `/categories` | 🔓 | קטגוריות | 200 `[{value,label}]` |
| POST | `/auth/register` | 🔓 | הרשמה | 201 `{token, user}` |
| POST | `/auth/login` | 🔓 | התחברות | 200 `{token, user}` |
| GET | `/auth/me` | 🔑 | המשתמש המחובר | 200 `User` |
| GET | `/polls` | 🔓 (Token אופציונלי) | רשימת סקרים | 200 רשימה של `PollSummary` |
| GET | `/polls/:id` | 🔓 (Token אופציונלי) | פרטי סקר | 200 `PollDetails` |
| POST | `/polls` | 🔑 | יצירת סקר | 201 `PollDetails` |
| PUT | `/polls/:id` | 🔑 יוצרת בלבד | עריכה (רק ממתין/נדחה) | 200 `PollDetails` |
| DELETE | `/polls/:id` | 🔑 יוצרת (כל עוד אין הצבעות) או 👑 מנהל (תמיד) | מחיקה | 204 (בלי תוכן) |
| POST | `/polls/:id/close` | 🔑 יוצרת בלבד | סגירה מוקדמת | 200 `PollDetails` |
| POST | `/polls/:id/votes` | 🔑 | הצבעה | 201 `PollDetails` מעודכן |
| GET | `/polls/:id/results` | 🔑 | תוצאות | 200 `PollResults` |
| GET | `/admin/polls` | 👑 | כל הסקרים לניהול | 200 רשימה |
| POST | `/admin/polls/:id/approve` | 👑 | אישור (מממתין או מנדחה) | 200 `PollDetails` |
| POST | `/admin/polls/:id/reject` | 👑 | דחייה (מממתין או ממאושר), סיבה חובה | 200 `PollDetails` |
| PATCH | `/admin/polls/:id/visibility` | 👑 | הסתרה/החזרה | 200 `PollDetails` |

💡 ב-`GET /polls` וב-`GET /polls/:id` כדאי **לשלוח Token אם יש** - כך יגיעו `hasVoted`, `myChoices` ו-`permissions` נכונים.

### פרמטרים של `GET /polls` (Query String)

| פרמטר | ערכים | ברירת מחדל | הערות |
|---|---|---|---|
| `search` | טקסט עד 100 תווים | - | חיפוש בכותרת ובתיאור |
| `category` | `ENTERTAINMENT` / `FOOD` / `TRIPS` / `SPORT` / `GENERAL` | הכל | |
| `state` | `open` / `closed` | הכל | |
| `mine` | `true` | - | הסקרים שלי - **כולל ממתינים ונדחים**. דורש Token |
| `voted` | `true` | - | סקרים שהצבעתי בהם. דורש Token |
| `sort` | `newest` / `popular` / `closingSoon` | `newest` | `closingSoon` מציג רק פתוחים (אם לא נשלח `state`) |
| `page` | 1 ומעלה | 1 | |
| `limit` | 1-50 | 10 | |

דוגמה: `GET /polls?search=פיצה&category=FOOD&state=open&sort=popular&page=1&limit=10`

### פרמטרים של `GET /admin/polls`
`status` (`PENDING`/`APPROVED`/`REJECTED`), `hidden` (`true`/`false`), `search`, `page`, `limit`.
עם `status=PENDING` הסקרים הוותיקים מופיעים ראשונים (תור לאישור). כאן `creator` כולל גם `email`.

---

## 5. אילו Endpoints צריך בכל מסך

| # | מסך | Endpoints |
|---|---|---|
| 1 | התחברות | `POST /auth/login` |
| 2 | הרשמה | `POST /auth/register` |
| - | טעינת האתר | `GET /auth/me` (אם יש Token שמור) |
| 3 | רשימת סקרים | `GET /polls` עם הפרמטרים, `GET /categories` לשדה הסינון |
| 4 | פרטי סקר | `GET /polls/:id` · הצבעה: `POST /polls/:id/votes` · דיאגרמה: `GET /polls/:id/results` (רק אם `permissions.canSeeResults`) |
| 5 | יצירת סקר | `GET /categories`, `POST /polls` |
| 6 | עריכת סקר | `GET /polls/:id` (למילוי הטופס), `PUT /polls/:id` |
| 7 | הסקרים שלי | `GET /polls?mine=true` · מחיקה: `DELETE /polls/:id` · סגירה: `POST /polls/:id/close` |
| 8 | ניהול - ממתינים | `GET /admin/polls?status=PENDING` · `POST /admin/polls/:id/approve` · `POST /admin/polls/:id/reject` |
| 9 | ניהול - כל הסקרים | `GET /admin/polls` (עם `status` / `hidden` / `search`) · `PATCH /admin/polls/:id/visibility` |

### זרימה מומלצת במסך "פרטי סקר"
1. `GET /polls/:id` (עם Token אם יש).
2. אם `permissions.canVote` → להציג כל שאלה עם האפשרויות שלה (כפתורי רדיו אם `allowMultiple=false` בשאלה, תיבות סימון אם `true`) וכפתור "הצבעה" אחד לכל הסקר. כדאי לאפשר שליחה רק אחרי שענו על כל השאלות.
3. אחרי הצבעה מוצלחת (201) - התשובה כבר כוללת את הסקר המעודכן (`canSeeResults: true`) ← לקרוא ל-`GET /polls/:id/results` ולהציג דיאגרמה.
4. אם `permissions.canSeeResults` כבר בהתחלה → להציג ישר את הדיאגרמה.
5. אורח (בלי Token) → להציג "התחברי כדי להצביע ולראות תוצאות".
6. ⚠️ להזהיר לפני ההצבעה: **הצבעה סופית - אי אפשר לשנות.**

---

## 6. גופי בקשות ושדות חובה בטפסים

### הרשמה - `POST /auth/register`
```json
{ "name": "מיכל לוי", "email": "michal@example.com", "password": "Michal1234" }
```
| שדה | חובה | כללים |
|---|---|---|
| `name` | ✅ | 2-50 תווים |
| `email` | ✅ | אימייל תקין |
| `password` | ✅ | 8-72 תווים, לפחות אות באנגלית אחת וספרה אחת |

### התחברות - `POST /auth/login`
```json
{ "email": "noa@example.com", "password": "User1234!" }
```

### יצירה / עריכה של סקר - `POST /polls`, `PUT /polls/:id`
```json
{
  "title": "איזה סרט נראה בשישי?",
  "description": "נפגשים אצל דנה ב-20:00",
  "category": "ENTERTAINMENT",
  "closesAt": "2026-12-31T20:00:00.000Z",
  "questions": [
    { "text": "איזה סרט נראה?", "options": ["קומדיה", "אקשן", "דרמה"] },
    { "text": "באיזה סטייל לבוש באים?", "options": ["פיג׳מות", "יומיומי"] },
    { "text": "באיזו שעה נפגשים?", "allowMultiple": true, "options": ["19:00", "20:00", "21:00"] }
  ]
}
```
| שדה | חובה | כללים |
|---|---|---|
| `title` | ✅ | 5-150 תווים |
| `description` | | עד 500 תווים (אפשר להשמיט או לשלוח `null`) |
| `category` | ✅ | אחד מערכי הקטגוריות |
| `closesAt` | ✅ | תאריך ISO בעתיד, עד שנה מהיום |
| `questions` | ✅ | מערך של 1-10 שאלות. הסדר נשמר |
| `questions[].text` | ✅ | 2-150 תווים |
| `questions[].allowMultiple` | | `true`/`false` (ברירת מחדל `false`) |
| `questions[].options` | ✅ | מערך של 2-6 טקסטים שונים, כל אחד 1-100 תווים. הסדר נשמר |

- סקר עם שאלה אחת? שולחים `questions` עם שאלה אחת.
- בעריכה שולחים **את כל השדות** (כמו ביצירה). השאלות והאפשרויות מוחלפות ברשימה החדשה.
- אחרי עריכה הסקר חוזר ל-`PENDING` וסיבת הדחייה נמחקת.
- משתמשת רגילה: הסקר נוצר כ-`PENDING` → כדאי להציג "הסקר נשלח לאישור המנהל". מנהל: נוצר כ-`APPROVED`.

### הצבעה - `POST /polls/:id/votes`
```json
{ "optionIds": [11] }
```
שולחים את ה-`id` של האפשרויות שנבחרו **מכל השאלות יחד**, לא את הטקסט. למשל בסקר עם שתי שאלות: `{ "optionIds": [11, 13, 14] }`.
- חובה לענות על כל שאלה - אחרת 400 עם הודעה שאומרת על איזו שאלה לא ענו.
- בשאלה רגילה בדיוק אפשרות אחת; בשאלה עם `allowMultiple` אחת או יותר.

### דחייה - `POST /admin/polls/:id/reject`
```json
{ "reason": "השאלה לא ברורה, נא לנסח מחדש" }
```
`reason` חובה, 1 עד 300 תווים. אפשר לדחות סקר ממתין וגם סקר שאושר (ההצבעות נשמרות, והסקר מפסיק להיות גלוי).

### הסתרה - `PATCH /admin/polls/:id/visibility`
```json
{ "isHidden": true }
```

---

## 7. שגיאות

כל שגיאה חוזרת באותו מבנה:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "הנתונים שנשלחו אינם תקינים",
    "details": [
      { "field": "title", "message": "הכותרת חייבת להכיל לפחות 5 תווים" },
      { "field": "questions.0.options", "message": "יש להזין לפחות 2 אפשרויות תשובה" }
    ]
  }
}
```
- `message` - בעברית, אפשר להציג ישירות למשתמשת.
- `details` (רק בשגיאת ולידציה) - `field` הוא שם השדה בטופס, כך שאפשר להציג כל שגיאה מתחת לשדה שלה. בשאלות: `questions.1.text` = הטקסט של השאלה השנייה, `questions.0.options.2` = האפשרות השלישית בשאלה הראשונה.

| קוד HTTP | `error.code` | מתי | מה לעשות ב-React |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | שדה חסר / לא תקין | להציג את `details` ליד השדות |
| 400 | `BAD_REQUEST` | למשל: לא ענו על אחת השאלות, או יותר מבחירה אחת בשאלה רגילה | להציג `message` |
| 400 | `INVALID_JSON` | גוף בקשה לא תקין | לבדוק את הקוד ששולח |
| 401 | `UNAUTHORIZED` | אין Token | להעביר למסך התחברות |
| 401 | `INVALID_TOKEN` / `TOKEN_EXPIRED` | Token לא תקין / פג תוקף | למחוק Token ולהעביר להתחברות |
| 401 | `INVALID_CREDENTIALS` | אימייל או סיסמה שגויים | להציג בטופס ההתחברות |
| 403 | `FORBIDDEN` | אין הרשאה (לא מנהל / לא היוצרת) | להציג "אין הרשאה" |
| 403 | `RESULTS_LOCKED` | תוצאות לפני הצבעה | להציג "הצביעי כדי לראות תוצאות" |
| 404 | `NOT_FOUND` | הסקר לא קיים / לא מאושר | עמוד "לא נמצא" |
| 404 | `ROUTE_NOT_FOUND` | כתובת שגויה | לבדוק את ה-URL |
| 409 | `EMAIL_TAKEN` | אימייל כבר רשום | להציג בטופס ההרשמה |
| 409 | `ALREADY_VOTED` | כבר הצבעת | לרענן את הסקר |
| 409 | `POLL_CLOSED` | הסקר נסגר | לרענן את הסקר |
| 409 | `POLL_LOCKED` | עריכה/מחיקה של סקר מאושר | להסתיר את הכפתורים (`permissions`) |
| 409 | `POLL_NOT_OPEN` / `INVALID_STATUS` / `POLL_EXPIRED` | פעולה לא מתאימה למצב הסקר | להציג `message` |
| 429 | `TOO_MANY_REQUESTS` | יותר מדי ניסיונות התחברות | "נסי שוב בעוד כמה דקות" |
| 500 | `INTERNAL_ERROR` | תקלה בשרת | "משהו השתבש, נסי שוב" |

---

## 8. סיכום הרשאות

| פעולה | אורח | משתמשת | מנהל |
|---|---|---|---|
| צפייה בסקרים מאושרים | ✅ | ✅ | ✅ |
| יצירת סקר | ❌ | ✅ (ממתין לאישור) | ✅ (מאושר מיד) |
| עריכה של סקר **שלי** לפני אישור (ובלי הצבעות) | ❌ | ✅ | ✅ |
| מחיקה של סקר **שלי** כל עוד אין הצבעות | ❌ | ✅ | ✅ |
| מחיקה של כל סקר, כולל מאושר עם הצבעות | ❌ | ❌ | ✅ |
| סגירה מוקדמת של סקר **שלי** | ❌ | ✅ | ✅ |
| הצבעה (פעם אחת, סופית) | ❌ | ✅ | ✅ |
| צפייה בתוצאות (אחרי הצבעה או סגירה) | ❌ | ✅ | ✅ |
| צפייה בסקרים ממתינים/מוסתרים של אחרים | ❌ | ❌ | ✅ |
| אישור / דחייה / הסתרה | ❌ | ❌ | ✅ |

---

## 9. משתמשי הדגמה לבדיקה (בסביבת פיתוח)

| אימייל | סיסמה | תפקיד |
|---|---|---|
| admin@example.com | Admin1234! | מנהל |
| noa@example.com | User1234! | משתמשת |
| yossi@example.com | User1234! | משתמש |
| dana@example.com | User1234! | משתמשת |

בענן: המנהל הוא מה שהגדרת ב-`SEED_ADMIN_EMAIL`, ולמשתמשי ההדגמה יש הסיסמה מ-`SEED_DEMO_PASSWORD`.
