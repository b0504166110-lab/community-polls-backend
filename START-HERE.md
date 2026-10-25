# 🚀 מתחילים כאן - העלאת השרת לאינטרנט

המדריך הזה מיועד למי שמעולם לא העלתה שרת לאינטרנט. עברי על השלבים לפי הסדר.

**מה נעשה בסך הכל:**
1. **GitHub** - נשמור את הקוד באינטרנט.
2. **Neon** - ניצור מסד נתונים PostgreSQL חינמי.
3. **Render** - נפעיל את השרת, שיקרא את הקוד מ-GitHub ויתחבר ל-Neon.
4. **בדיקה** - נוודא שהכל עובד דרך Swagger.

⏱️ זמן משוער: 30-45 דקות. כל השירותים חינמיים ולא דורשים כרטיס אשראי (נכון לזמן כתיבת המדריך).

> ⚠️ **הערה חשובה:** אתרים משנים מדי פעם את העיצוב ואת שמות הכפתורים. שמות הכפתורים כאן נכונים לפי התיעוד הרשמי של האתרים בזמן הכתיבה, אבל ייתכן שתראי משהו מעט שונה. אם כפתור לא מופיע בדיוק כך - חפשי כפתור עם משמעות דומה.

> 🔐 **כלל זהב:** סיסמאות, כתובת מסד הנתונים ו-JWT_SECRET **לעולם** לא נכנסים לקוד או ל-GitHub. הם נכנסים רק להגדרות של Render (Environment Variables).

---

## הכנה: רשימת ערכים לשמירה

פתחי קובץ טקסט פרטי במחשב (למשל ב-Notepad, **לא** בתיקיית הפרויקט) ושמרי בו את הערכים במהלך הדרך:

```
כתובת מסד הנתונים (DATABASE_URL): ...
אימייל מנהל: ...
סיסמת מנהל: ...
סיסמת משתמשי הדגמה: ...
כתובת השרת ב-Render: ...
```

---

# חלק א - GitHub (שמירת הקוד)

### 1. פתיחת חשבון
1. היכנסי ל-https://github.com
2. לחצי **Sign up**.
3. הזיני אימייל, סיסמה ושם משתמש, ואשרי את האימייל שתקבלי.

### 2. יצירת Repository (מאגר קוד)
1. אחרי ההתחברות, לחצי על **+** בפינה העליונה ← **New repository**.
2. **Repository name:** `community-polls-backend`
3. בחרי **Public** (או **Private** - שתי האפשרויות עובדות עם Render).
4. **אל** תסמני את "Add a README file" (כבר יש לנו README).
5. לחצי **Create repository**.

### 3. חילוץ קובץ ה-ZIP
1. מצאי את הקובץ `backend-project.zip` במחשב.
2. לחיצה ימנית ← **חלץ הכל...** (Extract All) ← **חלץ**.
3. תיפתח תיקייה בשם `backend-project`. בתוכה תראי קבצים כמו `package.json`, `README.md` ותיקיות `src`, `prisma`.

### 4. העלאת הקבצים דרך הדפדפן
1. בעמוד ה-Repository החדש, לחצי על הקישור **uploading an existing file** (או **Add file** ← **Upload files**).
2. פתחי את התיקייה `backend-project` במחשב, **סמני את כל מה שבתוכה** (Ctrl+A) וגררי לחלון הדפדפן.
   - ❗ חשוב לגרור את **התוכן** של התיקייה ולא את התיקייה עצמה - כדי ש-`package.json` יהיה בשורש ה-Repository.
   - ודאי שגם הקבצים שמתחילים בנקודה עלו: `.gitignore`, `.env.example`, `.node-version`. אם הם לא מופיעים בסייר הקבצים: בסייר הקבצים של Windows ← **תצוגה** ← **הצג** ← סמני **פריטים מוסתרים**.
3. חכי שכל הקבצים יסיימו לעלות.
4. למטה, בתיבה **Commit changes**, כתבי: `העלאה ראשונה של השרת`.
5. לחצי **Commit changes**.

### 5. בדיקה שהקבצים נמצאים ב-GitHub
רענני את עמוד ה-Repository. אמורים להופיע בשורש:
- תיקיות: `docs`, `prisma`, `scripts`, `src`, `tests`
- קבצים: `package.json`, `package-lock.json`, `render.yaml`, `README.md`, `tsconfig.json` ועוד
- היכנסי ל-`prisma` ← `migrations` - צריכות להיות שלוש תיקיות.

✅ אם אין קובץ בשם `.env` (בלי `.example`) - מצוין, כך צריך.

---

# חלק ב - מסד נתונים (Neon)

בחרנו ב-**Neon** כי המסלול החינמי שלו קבוע ואינו פג (מסד הנתונים החינמי של Render נמחק אחרי 30 יום).

### 1. פתיחת חשבון
1. היכנסי ל-https://neon.com ולחצי **Sign up**.
2. הכי פשוט: **Continue with GitHub** (עם החשבון שפתחת בחלק א).

### 2. יצירת Database
1. Neon יבקש ליצור **Project**. מלאי:
   - **Project name:** `community-polls`
   - **Postgres version:** השאירי את ברירת המחדל.
   - **Region:** בחרי **AWS Europe Central 1 (Frankfurt)** - קרוב ל-Render באירופה.
2. לחצי **Create project**.
3. Neon יוצר אוטומטית מסד נתונים בשם `neondb` - נשתמש בו.

### 3. קבלת Connection String
1. בעמוד הפרויקט לחצי על הכפתור **Connect**.
2. בחלון שנפתח: Branch = `production` (או `main`), Database = `neondb`.
3. ❗ **כבי את המתג Connection pooling** - Prisma צריך חיבור ישיר כדי ליצור טבלאות.
   (כשהמתג כבוי, בכתובת **אין** את המילה `-pooler`.)
4. העתיקי את הכתובת. היא נראית בערך כך:
   ```
   postgresql://neondb_owner:AbCd1234@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
5. הוסיפי לסוף הכתובת: `&connect_timeout=15`
   (Neon "נרדם" אחרי כמה דקות בלי שימוש - זה נותן לו זמן להתעורר.)

### 4. שמירה בטוחה
- הדביקי את הכתובת בקובץ הטקסט הפרטי שלך.
- 🔐 הכתובת כוללת סיסמה! אל תשתפי אותה, אל תשלחי בצ'אט, ואל תכניסי לקוד או ל-GitHub.

### 5. קישור השרת למסד הנתונים
הקישור נעשה בחלק ג: נדביק את הכתובת במשתנה `DATABASE_URL` ב-Render. אין צורך ליצור טבלאות ידנית - השרת יוצר אותן לבד בכל הפעלה (`prisma migrate deploy`).

---

# חלק ג - Render (הפעלת השרת)

> ℹ️ **מגבלות המסלול החינמי של Render:** אחרי 15 דקות בלי שימוש השרת "נרדם", והבקשה הראשונה אחריו לוקחת כדקה. זה תקין. יש 750 שעות הפעלה בחודש - מספיק לשרת אחד.

### 1. פתיחת חשבון
1. היכנסי ל-https://render.com ולחצי **Get Started** / **Sign Up**.
2. בחרי **GitHub** כדי להתחבר עם חשבון ה-GitHub שלך.

### 2. חיבור GitHub
בפעם הראשונה Render יבקש הרשאה לגשת ל-GitHub. אשרי, ואפשר לבחור **Only select repositories** ולסמן את `community-polls-backend`.

### 3. יצירת Web Service
1. ב-Dashboard לחצי **New** ← **Web Service**.

### 4. בחירת ה-Repository
2. ברשימה בחרי את `community-polls-backend` ולחצי **Connect**.

### 5. הגדרת Build ו-Start
מלאי את השדות בדיוק כך:

| שדה | ערך |
|---|---|
| **Name** | `community-polls-api` (השם יופיע בכתובת השרת) |
| **Language** | `Node` |
| **Branch** | `main` |
| **Region** | `Frankfurt (EU Central)` |
| **Root Directory** | השאירי ריק |
| **Build Command** | `npm ci --include=dev && npm run build` |
| **Start Command** | `npm run start:render` |
| **Instance Type** | **Free** |

### 6. הגדרת משתני סביבה
בחלק **Environment Variables** לחצי **Add Environment Variable** והוסיפי כל שורה:

| NAME | VALUE |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24` |
| `DATABASE_URL` | הכתובת מ-Neon (מחלק ב) |
| `JWT_SECRET` | לחצי **Generate** אם יש כפתור כזה; אחרת - הדביקי מחרוזת אקראית של לפחות 40 תווים (אותיות ומספרים) |
| `JWT_EXPIRES_IN` | `2h` |
| `CORS_ORIGIN` | הכתובת של אתר ה-React. אם עדיין אין - `http://localhost:5173` |
| `SEED_ADMIN_EMAIL` | האימייל של המנהל, למשל `admin@mysite.com` |
| `SEED_ADMIN_PASSWORD` | סיסמה חזקה למנהל (לפחות 8 תווים) |
| `SEED_DEMO_PASSWORD` | (לא חובה) סיסמה למשתמשי הדגמה - אם תרצי סקרים לדוגמה |

> 💡 עם `SEED_DEMO_PASSWORD` ייווצרו המשתמשים `noa@example.com`, `yossi@example.com`, `dana@example.com` עם הסיסמה שבחרת, ו-8 סקרי הדגמה. מומלץ להגשה - כך יש נתונים לבדיקה.

> 💡 כשתעלי את אתר ה-React (למשל ל-Netlify/Vercel), חזרי ל-**Environment** ב-Render ועדכני את `CORS_ORIGIN` לכתובת האתר, למשל `https://my-polls.netlify.app`. אפשר כמה כתובות מופרדות בפסיק: `http://localhost:5173,https://my-polls.netlify.app`

### 7. Health Check (מומלץ)
אם יש חלק **Advanced** ← **Health Check Path**, כתבי: `/api/health`

### 8. הפעלת Prisma Migrations
אין צורך לעשות שום דבר ידני! ה-Start Command (`npm run start:render`) מריץ אוטומטית:
1. `prisma migrate deploy` - יוצר/מעדכן את הטבלאות.
2. Seed - יוצר את המנהל (ונתוני הדגמה אם ביקשת). לא משכפל נתונים בהפעלות הבאות.
3. מפעיל את השרת.

### 9. Deploy
1. לחצי **Deploy Web Service** (או **Create Web Service**).
2. יופיע מסך **Logs** עם הרבה שורות. חכי כמה דקות.
3. כשמופיע `✅ השרת פועל על פורט ...` ומעל המסך מופיע **Live** - השרת באוויר! 🎉

### 10. בדיקה שהשרת פעיל
למעלה בעמוד השירות יש כתובת כמו `https://community-polls-api.onrender.com` - העתיקי אותה לקובץ הפרטי.

> 🔁 **עדכונים בעתיד:** כל העלאה של קבצים חדשים ל-GitHub (ל-branch `main`) תגרום ל-Render לבנות ולהפעיל מחדש אוטומטית.

> 🧩 **חלופה מהירה (Blueprint):** בקובץ `render.yaml` כבר מוגדר הכל. אפשר ב-Render: **New** ← **Blueprint** ← לבחור את ה-Repository. Render ישאל רק על הערכים הסודיים (`DATABASE_URL`, `CORS_ORIGIN`, `SEED_...`) וייצור `JWT_SECRET` לבד.

---

# חלק ד - בדיקה שהכל עובד

החליפי `https://YOUR-APP.onrender.com` בכתובת שלך.

### 1. פתיחת `/api/health`
פתחי בדפדפן: `https://YOUR-APP.onrender.com/api/health`
אמור להופיע: `{"status":"ok","database":"ok",...}`
(אם השרת "ישן" - חכי עד דקה.)

### 2. פתיחת `/api-docs`
פתחי: `https://YOUR-APP.onrender.com/api-docs` - יופיע מסך Swagger עם כל ה-Endpoints.

### 3. התחברות מתוך Swagger
1. פתחי את **Auth** ← `POST /api/auth/login`.
2. לחצי **Try it out**.
3. בתיבה כתבי (עם האימייל והסיסמה של המנהל שהגדרת):
   ```json
   { "email": "admin@mysite.com", "password": "הסיסמה-שלך" }
   ```
4. לחצי **Execute**.

### 4. קבלת JWT
בתשובה (Response body) יופיע `"token": "eyJhbGciOi..."` - העתיקי את הערך הארוך **בלי המרכאות**.

### 5. שימוש ב-Authorize
1. גללי למעלה ולחצי על הכפתור **Authorize** 🔒.
2. הדביקי את ה-Token בשדה **Value** (בלי המילה Bearer).
3. לחצי **Authorize** ← **Close**.

### 6. קריאה ל-Endpoint מוגן
`GET /api/auth/me` ← **Try it out** ← **Execute** - אמורים להופיע הפרטים שלך עם `"role": "ADMIN"`.
🧪 בדיקת 401: לחצי **Authorize** ← **Logout**, ונסי שוב - תקבלי `401`.
🧪 בדיקת 403: הירשמי כמשתמשת רגילה ב-`POST /api/auth/register`, התחברי עם ה-Token שלה ונסי `GET /api/admin/polls` - תקבלי `403`.

### 7. הוספת רשומה
התחברי שוב כמנהל (Authorize עם ה-Token של המנהל) ← `POST /api/polls` ← **Try it out** ← שני את `closesAt` לתאריך עתידי ← **Execute**.
תקבלי `201` עם הסקר החדש. העתיקי את ה-`id` שלו.

### 8. שליפת הרשומה ממסד הנתונים
`GET /api/polls/{id}` ← **Try it out** ← הזיני את ה-`id` ← **Execute** - הסקר חוזר ממסד הנתונים. 🎉
(אפשר גם לראות את הטבלאות ב-Neon: בתפריט **Tables**.)

---

# חלק ה - פתרון תקלות

| תקלה | מה רואים | פתרון |
|---|---|---|
| **Build Failed** | ב-Logs מופיע `npm ERR!` או `error TS` | ודאי שה-Build Command הוא בדיוק `npm ci --include=dev && npm run build`, ושהקבצים `package.json` ו-`package-lock.json` נמצאים **בשורש** ה-Repository ולא בתוך תת-תיקייה. אם הם בתת-תיקייה - כתבי את שמה ב-**Root Directory**. |
| **DATABASE_URL שגוי** | `P1001: Can't reach database server` או `P1000: Authentication failed` | העתיקי מחדש את הכתובת מ-Neon (כפתור **Connect**), ודאי שאין רווחים או מרכאות מיותרות, שיש `sslmode=require`, ושהוספת `&connect_timeout=15`. |
| **בעיית Prisma / Migrations** | `P3009` / `P3018` / `migrate deploy` נכשל | ודאי שכיבית את **Connection pooling** ב-Neon (בכתובת אסור שיהיה `-pooler`). ודאי שתיקיית `prisma/migrations` הועלתה ל-GitHub עם שלוש התיקיות שבתוכה. |
| **JWT_SECRET חסר** | ב-Logs: `JWT_SECRET חסר` או `JWT_SECRET חייב להכיל לפחות 32 תווים` | הוסיפי ב-Render ← **Environment** משתנה `JWT_SECRET` עם מחרוזת אקראית ארוכה (40+ תווים). אסור להשתמש בערך שמתחיל ב-`change-me`. שמרי ← Render יפעיל מחדש. |
| **שגיאת CORS** | בדפדפן של אתר ה-React (F12 ← Console): `blocked by CORS policy` | עדכני את `CORS_ORIGIN` ב-Render לכתובת **המדויקת** של אתר ה-React - כולל `https://`, בלי `/` בסוף. למשל `https://my-polls.netlify.app`. |
| **401 Unauthorized** | `UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` | לא נשלח Token, הוא הודבק לא נכון, או שפג תוקפו (אחרי שעתיים). התחברי מחדש וקבלי Token חדש. ב-Swagger: הדביקי **בלי** המילה Bearer. |
| **403 Forbidden** | `FORBIDDEN` / `RESULTS_LOCKED` | הפעולה לא מותרת למשתמש הזה: Endpoints של `/api/admin` - רק למנהל; עריכה/מחיקה/סגירה - רק ליוצר הסקר; תוצאות - רק אחרי הצבעה או סגירה. זו התנהגות נכונה! |
| **Swagger לא נפתח** | עמוד ריק / שגיאה | ודאי שהכתובת היא `/api-docs` (עם מקף). חכי דקה אם השרת ישן. נסי רענון מלא (Ctrl+F5). |
| **השרת לא עולה** | ב-Render מופיע **Failed** או **Deploy failed** | פתחי **Logs** וחפשי את השורה האדומה הראשונה. ברוב המקרים חסר משתנה סביבה (השרת כותב בדיוק איזה) או ש-`DATABASE_URL` שגוי. |
| **הבקשה הראשונה איטית מאוד** | לוקח ~דקה | השרת החינמי נרדם אחרי 15 דקות. זה תקין. |
| **לא מצליחה להתחבר כמנהל** | `401 INVALID_CREDENTIALS` | ודאי שהגדרת גם `SEED_ADMIN_EMAIL` וגם `SEED_ADMIN_PASSWORD` **לפני** ההפעלה. אם הוספת אותם אחר כך - שמירת המשתנים מפעילה מחדש ויוצרת את המנהל. שימי לב: אם המנהל כבר נוצר, שינוי `SEED_ADMIN_PASSWORD` **לא** משנה את הסיסמה שלו. |

---

🎓 **סיימת!** עכשיו אפשר לעבור לכתיבת ה-React. כל מה שצריך נמצא ב-[FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).
