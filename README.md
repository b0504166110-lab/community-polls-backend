# 🗳️ סקרים בקהילה - Backend

שרת API לאתר סקרים קהילתי: משתמשים נרשמים, יוצרים סקרים (עם שאלה אחת או כמה שאלות בכל סקר), מנהל מאשר אותם, וכולם מצביעים ורואים תוצאות בדיאגרמות - דיאגרמה לכל שאלה.

> 👋 **פעם ראשונה כאן?** התחילי מהקובץ [START-HERE.md](START-HERE.md) - הוראות צעד-אחר-צעד להעלאה לאינטרנט.
> 👩‍💻 **כותבת את צד ה-React?** כל מה שצריך נמצא ב-[FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).

---

## טכנולוגיות

| תחום | טכנולוגיה |
|---|---|
| סביבת הרצה | Node.js 24 LTS |
| שרת | Express 5 |
| שפה | TypeScript (strict) |
| מסד נתונים | PostgreSQL |
| ORM | Prisma 6 |
| ולידציה | Zod |
| התחברות | JWT (jsonwebtoken) + bcrypt (bcryptjs) |
| תיעוד | Swagger UI / OpenAPI 3 |
| בדיקות | Vitest + Supertest |
| אבטחה | Helmet, CORS, Rate Limit על התחברות |

אין תלות בשירותי AI או במפתחות בתשלום.

---

## מבנה התיקיות

```
backend-project/
├── src/
│   ├── server.ts              # נקודת הכניסה - מפעיל את השרת
│   ├── app.ts                 # הרכבת Express: אבטחה, CORS, Swagger, Routes, שגיאות
│   ├── config/env.ts          # קריאה ובדיקה של משתני הסביבה
│   ├── db/prisma.ts           # החיבור למסד הנתונים
│   ├── routes/index.ts        # כל הכתובות (URL) וההרשאות שלהן
│   ├── controllers/           # מקבלים בקשה -> ולידציה -> קוראים ל-Service -> מחזירים תשובה
│   ├── services/              # הלוגיקה העסקית (כללי סקרים, הצבעה, ניהול)
│   ├── validation/            # סכמות Zod לבדיקת הקלט
│   ├── middleware/            # אימות (JWT), הרשאות, טיפול בשגיאות, Rate Limit
│   ├── docs/openapi.ts        # תיעוד Swagger
│   ├── seed/seed.ts           # נתוני הדגמה
│   ├── constants/, utils/, types/
├── prisma/
│   ├── schema.prisma          # מבנה הטבלאות
│   └── migrations/            # קובצי SQL שיוצרים את הטבלאות
├── tests/                     # בדיקות אוטומטיות
├── docs/
│   ├── openapi.json           # קובץ OpenAPI (נוצר ב-npm run openapi)
│   └── SPEC.md                # מסמך האפיון שאושר
├── scripts/generate-openapi.ts
├── render.yaml                # הגדרות פריסה ל-Render
├── prisma.config.ts
├── START-HERE.md / FRONTEND-API-GUIDE.md
```

---

## הרצה במחשב (לפיתוח)

**דרישות:** Node.js 20.19 ומעלה (מומלץ 24 LTS), ומסד נתונים PostgreSQL - מקומי, או חינמי בענן (Neon - ראי START-HERE.md חלק ב).

```bash
# 1. התקנת התלויות
npm install

# 2. יצירת קובץ הגדרות
#    העתיקי את .env.example לקובץ חדש בשם .env ומלאי DATABASE_URL ו-JWT_SECRET
#    (ב-Windows: copy .env.example .env   |   ב-Mac/Linux: cp .env.example .env)

# 3. יצירת הטבלאות במסד הנתונים
npm run db:deploy

# 4. הוספת נתוני הדגמה
npm run db:seed

# 5. הפעלת השרת (מתעדכן אוטומטית כשמשנים קוד)
npm run dev
```

פתחי בדפדפן:
- http://localhost:3000/api/health - בדיקת תקינות
- http://localhost:3000/api-docs - Swagger

### משתמשי הדגמה (בסביבת פיתוח בלבד)

| תפקיד | אימייל | סיסמה |
|---|---|---|
| מנהל | admin@example.com | Admin1234! |
| משתמשת | noa@example.com | User1234! |
| משתמש | yossi@example.com | User1234! |
| משתמשת | dana@example.com | User1234! |

ה-Seed יוצר גם 8 סקרים: פתוחים, סגורים, סקר עם כמה שאלות, בחירה מרובה, ממתין לאישור, נדחה ומוסתר - כדי שאפשר יהיה לבדוק כל מסך וכל הרשאה.

> 🔒 **בפרודקשן (NODE_ENV=production) לא נוצרות סיסמאות ידועות.** המנהל נוצר רק אם הוגדרו `SEED_ADMIN_EMAIL` ו-`SEED_ADMIN_PASSWORD`, ונתוני הדגמה נוצרים רק אם הוגדרה `SEED_DEMO_PASSWORD` (המשתמשים noa/yossi/dana יקבלו את הסיסמה הזו).

---

## כל הפקודות

| פקודה | מה היא עושה |
|---|---|
| `npm run dev` | הפעלת שרת פיתוח עם רענון אוטומטי |
| `npm run build` | `prisma generate` + קומפילציה ל-`dist/` |
| `npm start` | הפעלת הגרסה המקומפלת |
| `npm run start:render` | Migrations -> Seed -> הפעלת השרת (הפקודה של Render) |
| `npm run typecheck` | בדיקת TypeScript בלי לקמפל |
| `npm test` | הרצת כל הבדיקות האוטומטיות |
| `npm run db:migrate` | יצירת Migration חדשה אחרי שינוי ב-`schema.prisma` |
| `npm run db:deploy` | החלת ה-Migrations על מסד הנתונים |
| `npm run db:seed` | הוספת נתוני הדגמה (אפשר להריץ שוב - לא משכפל) |
| `npm run db:reset` | ⚠️ מחיקת כל הנתונים ובנייה מחדש (רק בפיתוח!) |
| `npm run db:studio` | צפייה בנתונים בדפדפן (Prisma Studio) |
| `npm run openapi` | עדכון הקובץ `docs/openapi.json` |

---

## משתני סביבה

| משתנה | חובה | תיאור |
|---|---|---|
| `DATABASE_URL` | ✅ | כתובת החיבור ל-PostgreSQL |
| `JWT_SECRET` | ✅ | מפתח סודי, לפחות 32 תווים. בפרודקשן אסור להשתמש בערך שבדוגמה |
| `JWT_EXPIRES_IN` | | תוקף ה-Token (ברירת מחדל `2h`) |
| `PORT` | | פורט (ברירת מחדל 3000; ב-Render נקבע אוטומטית) |
| `NODE_ENV` | | `development` / `production` / `test` |
| `CORS_ORIGIN` | | כתובות אתר ה-React, מופרדות בפסיק. `*` = הכל (רק לפיתוח) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | | יצירת חשבון המנהל ב-Seed |
| `SEED_DEMO_PASSWORD` | | בפרודקשן: יצירת משתמשי וסקרי הדגמה עם הסיסמה הזו |
| `TEST_DATABASE_URL` | לבדיקות | מסד **נפרד** לבדיקות - הבדיקות מוחקות בו את כל הנתונים |

אם משתנה חובה חסר - השרת לא יעלה ויכתוב בדיוק מה חסר.

---

## בדיקות אוטומטיות

הבדיקות רצות מול PostgreSQL אמיתי, במסד נפרד שמוגדר ב-`TEST_DATABASE_URL`.
אם `TEST_DATABASE_URL` חסר או זהה ל-`DATABASE_URL` - הבדיקות מסרבות לרוץ, כדי לא למחוק נתונים אמיתיים.

```bash
npm test
```

מה נבדק (102 בדיקות): הרשמה ו-Login תקין/שגוי, Token חסר / לא תקין / שפג תוקפו / חתום במפתח אחר, הרשאות מנהל ומשתמש (401/403),
יצירה/עריכה/מחיקה/סגירה, ולידציה של כל השדות, חיפוש/סינון/מיון/עמודים, מניעת גישה לסקרים לא מאושרים (404),
סקרים עם כמה שאלות (חובה לענות על כל שאלה, תוצאות לכל שאלה), הצבעה סופית (כולל שתי בקשות בו-זמנית), בחירה מרובה, נעילת תוצאות ואנונימיות, אילוצי מסד הנתונים, תקינות OpenAPI ו-Swagger UI.

---

## אבטחה - מה מומש

- סיסמאות נשמרות כ-Hash של bcrypt; ה-Hash אף פעם לא מוחזר ב-API.
- JWT חתום (HS256) עם תוקף מוגבל; המפתח רק במשתנה סביבה.
- המשתמש המחובר והתפקיד שלו נקבעים לפי ה-Token ומסד הנתונים - לא לפי מה שהלקוח שולח (`creatorId`, `userId`, `role`, `status` שנשלחים בבקשה - מתעלמים מהם).
- הרשמה תמיד יוצרת `USER`; מנהל נוצר רק דרך ה-Seed.
- סקר לא מאושר / מוסתר של משתמש אחר מחזיר 404 - לא חושפים שהוא קיים.
- הצבעה אנונימית: התוצאות כוללות רק ספירות; אילוץ ייחודי במסד מונע הצבעה כפולה.
- הגבלת קצב על הרשמה והתחברות, Helmet, CORS מוגדר, גבול לגודל גוף הבקשה.
- אילוצי CHECK במסד הנתונים כשכבת הגנה נוספת.
