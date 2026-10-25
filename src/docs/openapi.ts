// מסמך OpenAPI 3 - מוצג ב-/api-docs ונשמר גם כקובץ docs/openapi.json (npm run openapi)

const errorExample = (code: string, message: string) => ({ error: { code, message } });

const errorResponse = (description: string, code: string, message: string) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: errorExample(code, message),
    },
  },
});

const R = {
  validation: {
    description: 'נתונים לא תקינים (Validation)',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'הנתונים שנשלחו אינם תקינים',
            details: [{ field: 'title', message: 'הכותרת חייבת להכיל לפחות 5 תווים' }],
          },
        },
      },
    },
  },
  unauthorized: errorResponse('לא מחובר / Token חסר, לא תקין או שפג תוקפו', 'UNAUTHORIZED', 'יש להתחבר כדי לבצע פעולה זו'),
  forbidden: errorResponse('אין הרשאה לפעולה', 'FORBIDDEN', 'אין לך הרשאה לבצע פעולה זו'),
  adminOnly: errorResponse('המשתמש המחובר אינו מנהל', 'FORBIDDEN', 'פעולה זו מותרת למנהל בלבד'),
  notFound: errorResponse('הסקר לא נמצא (או שאין הרשאה לראות אותו)', 'NOT_FOUND', 'הסקר לא נמצא'),
};

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'מזהה הסקר',
  schema: { type: 'integer', minimum: 1 },
  example: 1,
};

const pageParams = [
  { name: 'page', in: 'query', description: 'מספר עמוד (ברירת מחדל 1)', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', description: 'כמה תוצאות בעמוד (1-50, ברירת מחדל 10)', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
];

const searchParam = {
  name: 'search',
  in: 'query',
  description: 'חיפוש טקסט בכותרת, בתיאור ובשאלות (ללא תלות באותיות גדולות/קטנות)',
  schema: { type: 'string', maxLength: 100 },
  example: 'סרט',
};

const bearer = [{ bearerAuth: [] }];
const optionalBearer = [{}, { bearerAuth: [] }];

const json = (schemaRef: string, example?: unknown) => ({
  'application/json': {
    schema: { $ref: `#/components/schemas/${schemaRef}` },
    ...(example !== undefined && { example }),
  },
});

const pollDetailsExample = {
  id: 1,
  title: 'ערב סרט אצל דנה בשישי',
  description: 'מביאים פופקורן',
  category: 'ENTERTAINMENT',
  categoryLabel: 'בילויים',
  closesAt: '2026-12-31T20:00:00.000Z',
  closedEarlyAt: null,
  status: 'APPROVED',
  isHidden: false,
  isOpen: true,
  rejectionReason: null,
  voterCount: 3,
  questionCount: 2,
  creator: { id: 2, name: 'נועה כהן' },
  hasVoted: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  questions: [
    {
      id: 1,
      text: 'איזה סרט נראה?',
      allowMultiple: false,
      position: 1,
      options: [
        { id: 1, text: 'קומדיה', position: 1 },
        { id: 2, text: 'אקשן', position: 2 },
        { id: 3, text: 'דרמה', position: 3 },
      ],
    },
    {
      id: 2,
      text: 'באיזו שעה נפגשים?',
      allowMultiple: true,
      position: 2,
      options: [
        { id: 4, text: '19:00', position: 1 },
        { id: 5, text: '20:00', position: 2 },
      ],
    },
  ],
  myChoices: [1, 4, 5],
  permissions: { canVote: false, canSeeResults: true, canEdit: false, canDelete: false, canClose: false },
};

const pollInputExample = {
  title: 'ערב סרט אצל דנה בשישי',
  description: 'מביאים פופקורן',
  category: 'ENTERTAINMENT',
  closesAt: '2026-12-31T20:00:00.000Z',
  questions: [
    { text: 'איזה סרט נראה?', allowMultiple: false, options: ['קומדיה', 'אקשן', 'דרמה'] },
    { text: 'באיזה סטייל לבוש באים?', options: ['פיג׳מות', 'יומיומי'] },
    { text: 'באיזו שעה נפגשים?', allowMultiple: true, options: ['19:00', '20:00', '21:00'] },
  ],
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Community Polls API - סקרים בקהילה',
    version: '1.0.0',
    description: [
      'API לאתר סקרים: משתמשים יוצרים סקרים, מנהל מאשר אותם, וכולם מצביעים ורואים תוצאות.',
      '',
      '**איך בודקים Endpoint מוגן:**',
      '1. פתחי את `POST /api/auth/login` ← **Try it out** ← הזיני אימייל וסיסמה ← **Execute**.',
      '2. העתיקי את הערך של `token` מהתשובה (בלי המרכאות).',
      '3. לחצי על הכפתור **Authorize** 🔒 למעלה, הדביקי את ה-Token ולחצי **Authorize**.',
      '4. מעכשיו כל בקשה תישלח עם `Authorization: Bearer <token>`.',
      '',
      '**כללים חשובים:** הצבעה היא סופית ואנונימית; תוצאות מוצגות רק אחרי הצבעה או אחרי סגירת הסקר; ',
      'סקר של משתמש רגיל ממתין לאישור מנהל; אפשר לערוך/למחוק סקר רק לפני שאושר.',
    ].join('\n'),
  },
  // כתובת יחסית - עובד גם במחשב המקומי וגם בענן בלי שינוי
  servers: [{ url: '/', description: 'השרת הנוכחי' }],
  tags: [
    { name: 'System', description: 'בדיקת תקינות ונתוני עזר' },
    { name: 'Auth', description: 'הרשמה, התחברות ומשתמש מחובר' },
    { name: 'Polls', description: 'סקרים - צפייה, יצירה, עריכה, מחיקה וסגירה' },
    { name: 'Votes', description: 'הצבעה ותוצאות' },
    { name: 'Admin', description: 'ניהול סקרים - מנהל בלבד' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'הדביקי כאן את ה-Token שהתקבל מ-login (בלי המילה Bearer)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'הנתונים שנשלחו אינם תקינים' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', nullable: true, example: 'title' },
                    message: { type: 'string', example: 'הכותרת חייבת להכיל לפחות 5 תווים' },
                  },
                },
              },
            },
          },
        },
      },
      Role: { type: 'string', enum: ['USER', 'ADMIN'] },
      PollStatus: {
        type: 'string',
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        description: 'PENDING = ממתין לאישור, APPROVED = מאושר, REJECTED = נדחה',
      },
      PollCategory: {
        type: 'string',
        enum: ['ENTERTAINMENT', 'FOOD', 'TRIPS', 'SPORT', 'GENERAL'],
        description: 'בילויים, אוכל, טיולים, ספורט, כללי',
      },
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'createdAt'],
        properties: {
          id: { type: 'integer', example: 2 },
          name: { type: 'string', example: 'נועה כהן' },
          email: { type: 'string', format: 'email', example: 'noa@example.com' },
          role: { $ref: '#/components/schemas/Role' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50, example: 'מיכל לוי' },
          email: { type: 'string', format: 'email', maxLength: 254, example: 'michal@example.com' },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 72,
            description: 'לפחות 8 תווים, כולל אות באנגלית וספרה',
            example: 'Michal1234',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'noa@example.com' },
          password: { type: 'string', example: 'User1234!' },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['token', 'user'],
        properties: {
          token: { type: 'string', description: 'JWT לשימוש בכותרת Authorization', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Creator: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer', example: 2 },
          name: { type: 'string', example: 'נועה כהן' },
        },
      },
      PollSummary: {
        type: 'object',
        required: [
          'id', 'title', 'description', 'category', 'categoryLabel', 'closesAt', 'closedEarlyAt',
          'status', 'isHidden', 'isOpen', 'rejectionReason', 'voterCount', 'questionCount', 'creator', 'hasVoted',
          'createdAt', 'updatedAt',
        ],
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'איזה סרט נראה בשישי?' },
          description: { type: 'string', nullable: true, example: 'נפגשים אצל דנה ב-20:00' },
          category: { $ref: '#/components/schemas/PollCategory' },
          categoryLabel: { type: 'string', example: 'בילויים' },
          closesAt: { type: 'string', format: 'date-time' },
          closedEarlyAt: { type: 'string', format: 'date-time', nullable: true, description: 'מתי היוצר סגר את הסקר מוקדם' },
          status: { $ref: '#/components/schemas/PollStatus' },
          isHidden: { type: 'boolean', description: 'הוסתר על ידי מנהל' },
          isOpen: { type: 'boolean', description: 'מאושר, לא מוסתר, לא נסגר ותאריך הסגירה לא עבר' },
          rejectionReason: { type: 'string', nullable: true, description: 'גלוי רק ליוצר ולמנהל' },
          voterCount: { type: 'integer', description: 'מספר המצביעים', example: 3 },
          questionCount: { type: 'integer', description: 'מספר השאלות בסקר', example: 2 },
          creator: { $ref: '#/components/schemas/Creator' },
          hasVoted: { type: 'boolean', description: 'האם המשתמש המחובר כבר הצביע (לאורח תמיד false)' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PollOption: {
        type: 'object',
        required: ['id', 'text', 'position'],
        properties: {
          id: { type: 'integer', example: 1 },
          text: { type: 'string', example: 'קומדיה' },
          position: { type: 'integer', example: 1 },
        },
      },
      PollQuestion: {
        type: 'object',
        required: ['id', 'text', 'allowMultiple', 'position', 'options'],
        properties: {
          id: { type: 'integer', example: 1 },
          text: { type: 'string', example: 'איזה סרט נראה?' },
          allowMultiple: { type: 'boolean', description: 'האם מותר לבחור כמה תשובות בשאלה הזו' },
          position: { type: 'integer', example: 1 },
          options: { type: 'array', items: { $ref: '#/components/schemas/PollOption' } },
        },
      },
      PollPermissions: {
        type: 'object',
        description: 'מה המשתמש הנוכחי יכול לעשות - נוח להצגה/הסתרה של כפתורים',
        required: ['canVote', 'canSeeResults', 'canEdit', 'canDelete', 'canClose'],
        properties: {
          canVote: { type: 'boolean' },
          canSeeResults: { type: 'boolean' },
          canEdit: { type: 'boolean' },
          canDelete: { type: 'boolean' },
          canClose: { type: 'boolean' },
        },
      },
      PollDetails: {
        allOf: [
          { $ref: '#/components/schemas/PollSummary' },
          {
            type: 'object',
            required: ['questions', 'myChoices', 'permissions'],
            properties: {
              questions: { type: 'array', items: { $ref: '#/components/schemas/PollQuestion' } },
              myChoices: {
                type: 'array',
                items: { type: 'integer' },
                description: 'מזהי האפשרויות שהמשתמש המחובר בחר (רק שלו)',
              },
              permissions: { $ref: '#/components/schemas/PollPermissions' },
            },
          },
        ],
      },
      PollInput: {
        type: 'object',
        required: ['title', 'category', 'closesAt', 'questions'],
        properties: {
          title: { type: 'string', minLength: 5, maxLength: 150 },
          description: { type: 'string', maxLength: 500, nullable: true },
          category: { $ref: '#/components/schemas/PollCategory' },
          closesAt: { type: 'string', format: 'date-time', description: 'בעתיד, ועד שנה מהיום (פורמט ISO)' },
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            description: '1-10 שאלות. הסדר נשמר',
            items: {
              type: 'object',
              required: ['text', 'options'],
              properties: {
                text: { type: 'string', minLength: 2, maxLength: 150 },
                allowMultiple: { type: 'boolean', default: false },
                options: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 6,
                  description: '2-6 אפשרויות שונות, כל אחת 1-100 תווים',
                  items: { type: 'string', minLength: 1, maxLength: 100 },
                },
              },
            },
          },
        },
        example: pollInputExample,
      },
      VoteRequest: {
        type: 'object',
        required: ['optionIds'],
        properties: {
          optionIds: {
            type: 'array',
            minItems: 1,
            items: { type: 'integer' },
            description: 'מזהי האפשרויות מכל השאלות יחד. חובה לענות על כל שאלה: בדיוק אפשרות אחת, או אחת ומעלה בשאלה עם allowMultiple',
          },
        },
        example: { optionIds: [1] },
      },
      PollResults: {
        type: 'object',
        required: ['pollId', 'title', 'isOpen', 'totalVoters', 'questions', 'myChoices'],
        properties: {
          pollId: { type: 'integer' },
          title: { type: 'string' },
          isOpen: { type: 'boolean' },
          totalVoters: { type: 'integer', description: 'מספר המצביעים' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'text', 'allowMultiple', 'totalChoices', 'options'],
              properties: {
                id: { type: 'integer' },
                text: { type: 'string' },
                allowMultiple: { type: 'boolean' },
                totalChoices: { type: 'integer', description: 'סך הבחירות בשאלה (בבחירה מרובה יכול להיות גדול ממספר המצביעים)' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'text', 'count', 'percent'],
                    properties: {
                      id: { type: 'integer' },
                      text: { type: 'string' },
                      count: { type: 'integer' },
                      percent: { type: 'number', description: 'אחוז מתוך המצביעים, ספרה אחת אחרי הנקודה' },
                    },
                  },
                },
              },
            },
          },
          myChoices: { type: 'array', items: { type: 'integer' } },
        },
        example: {
          pollId: 1,
          title: 'ערב סרט אצל דנה בשישי',
          isOpen: true,
          totalVoters: 3,
          questions: [
            {
              id: 1,
              text: 'איזה סרט נראה?',
              allowMultiple: false,
              totalChoices: 3,
              options: [
                { id: 1, text: 'קומדיה', count: 2, percent: 66.7 },
                { id: 2, text: 'אקשן', count: 1, percent: 33.3 },
                { id: 3, text: 'דרמה', count: 0, percent: 0 },
              ],
            },
            {
              id: 2,
              text: 'באיזו שעה נפגשים?',
              allowMultiple: true,
              totalChoices: 4,
              options: [
                { id: 4, text: '19:00', count: 1, percent: 33.3 },
                { id: 5, text: '20:00', count: 3, percent: 100 },
              ],
            },
          ],
          myChoices: [1, 4, 5],
        },
      },
      PollList: {
        type: 'object',
        required: ['items', 'page', 'limit', 'total', 'totalPages'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/PollSummary' } },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 7 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      AdminPollList: {
        type: 'object',
        required: ['items', 'page', 'limit', 'total', 'totalPages'],
        properties: {
          items: {
            type: 'array',
            items: {
              allOf: [
                { $ref: '#/components/schemas/PollSummary' },
                {
                  type: 'object',
                  properties: {
                    creator: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                      },
                    },
                  },
                },
              ],
            },
          },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          database: { type: 'string', enum: ['ok', 'error'] },
          uptimeSeconds: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          value: { $ref: '#/components/schemas/PollCategory' },
          label: { type: 'string', example: 'בילויים' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'בדיקת תקינות השרת ומסד הנתונים',
        security: [],
        responses: {
          200: {
            description: 'השרת ומסד הנתונים פעילים',
            content: json('Health', { status: 'ok', database: 'ok', uptimeSeconds: 42, timestamp: '2026-10-15T12:00:00.000Z' }),
          },
          503: { description: 'אין חיבור למסד הנתונים', content: json('Health', { status: 'error', database: 'error', uptimeSeconds: 42, timestamp: '2026-10-15T12:00:00.000Z' }) },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['System'],
        summary: 'רשימת הקטגוריות (לשדה בחירה בטופס)',
        security: [],
        responses: {
          200: {
            description: 'רשימת קטגוריות',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
                example: [
                  { value: 'ENTERTAINMENT', label: 'בילויים' },
                  { value: 'FOOD', label: 'אוכל' },
                  { value: 'TRIPS', label: 'טיולים' },
                  { value: 'SPORT', label: 'ספורט' },
                  { value: 'GENERAL', label: 'כללי' },
                ],
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'הרשמה (יוצרת תמיד משתמש רגיל) ומחזירה Token',
        security: [],
        requestBody: { required: true, content: json('RegisterRequest') },
        responses: {
          201: { description: 'נרשמת בהצלחה - המשתמש מחובר', content: json('AuthResponse') },
          400: R.validation,
          409: errorResponse('האימייל כבר רשום', 'EMAIL_TAKEN', 'כתובת האימייל כבר רשומה במערכת'),
          429: errorResponse('יותר מדי ניסיונות', 'TOO_MANY_REQUESTS', 'יותר מדי ניסיונות - נסי שוב בעוד כמה דקות'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'התחברות - מחזירה JWT',
        description: 'משתמשי הדגמה (בסביבת פיתוח): admin@example.com / Admin1234! , noa@example.com / User1234!',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              examples: {
                user: { summary: 'משתמשת רגילה (נועה)', value: { email: 'noa@example.com', password: 'User1234!' } },
                admin: { summary: 'מנהל', value: { email: 'admin@example.com', password: 'Admin1234!' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'התחברת בהצלחה', content: json('AuthResponse') },
          400: R.validation,
          401: errorResponse('אימייל או סיסמה שגויים', 'INVALID_CREDENTIALS', 'אימייל או סיסמה שגויים'),
          429: errorResponse('יותר מדי ניסיונות', 'TOO_MANY_REQUESTS', 'יותר מדי ניסיונות - נסי שוב בעוד כמה דקות'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'פרטי המשתמש המחובר (לפי ה-Token)',
        security: bearer,
        responses: {
          200: { description: 'המשתמש המחובר', content: json('User') },
          401: R.unauthorized,
        },
      },
    },
    '/api/polls': {
      get: {
        tags: ['Polls'],
        summary: 'רשימת סקרים עם חיפוש, סינון, מיון ועמודים',
        description:
          'ציבורי - אורח רואה רק סקרים מאושרים. אם נשלח Token, כל סקר יכלול hasVoted. ' +
          'mine=true מחזיר את כל הסקרים שלי בכל הסטטוסים. state מתייחס לסקרים מאושרים.',
        security: optionalBearer,
        parameters: [
          searchParam,
          { name: 'category', in: 'query', schema: { $ref: '#/components/schemas/PollCategory' } },
          { name: 'state', in: 'query', description: 'open = פתוחים, closed = סגורים', schema: { type: 'string', enum: ['open', 'closed'] } },
          { name: 'mine', in: 'query', description: 'רק הסקרים שיצרתי (דורש Token)', schema: { type: 'boolean' } },
          { name: 'voted', in: 'query', description: 'רק סקרים שהצבעתי בהם (דורש Token)', schema: { type: 'boolean' } },
          {
            name: 'sort',
            in: 'query',
            description: 'newest = חדשים, popular = הכי הרבה מצביעים, closingSoon = נסגרים בקרוב (פתוחים בלבד אם לא נשלח state)',
            schema: { type: 'string', enum: ['newest', 'popular', 'closingSoon'], default: 'newest' },
          },
          ...pageParams,
        ],
        responses: {
          200: { description: 'רשימת סקרים', content: json('PollList') },
          400: R.validation,
          401: errorResponse('נשלח Token לא תקין, או mine/voted בלי התחברות', 'UNAUTHORIZED', 'הסינון "שלי" או "הצבעתי" דורש התחברות'),
        },
      },
      post: {
        tags: ['Polls'],
        summary: 'יצירת סקר',
        description: 'משתמש רגיל - הסקר נוצר בסטטוס PENDING וממתין לאישור. מנהל - הסקר מאושר מיד.',
        security: bearer,
        requestBody: { required: true, content: json('PollInput', pollInputExample) },
        responses: {
          201: { description: 'הסקר נוצר', content: json('PollDetails', { ...pollDetailsExample, status: 'PENDING', isOpen: false, voterCount: 0, hasVoted: false, myChoices: [], permissions: { canVote: false, canSeeResults: false, canEdit: true, canDelete: true, canClose: false } }) },
          400: R.validation,
          401: R.unauthorized,
        },
      },
    },
    '/api/polls/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Polls'],
        summary: 'פרטי סקר כולל אפשרויות והרשאות',
        description: 'סקר שלא אושר או שהוסתר - נגיש רק ליוצר ולמנהל; לאחרים מוחזר 404.',
        security: optionalBearer,
        responses: {
          200: { description: 'פרטי הסקר', content: json('PollDetails', pollDetailsExample) },
          400: R.validation,
          401: R.unauthorized,
          404: R.notFound,
        },
      },
      put: {
        tags: ['Polls'],
        summary: 'עריכת סקר (יוצר בלבד, רק לפני אישור)',
        description: 'אפשר לערוך רק סקר בסטטוס PENDING או REJECTED. אחרי העריכה הסקר חוזר ל-PENDING.',
        security: bearer,
        requestBody: { required: true, content: json('PollInput', pollInputExample) },
        responses: {
          200: { description: 'הסקר עודכן', content: json('PollDetails') },
          400: R.validation,
          401: R.unauthorized,
          403: errorResponse('המשתמש אינו יוצר הסקר', 'FORBIDDEN', 'רק יוצר הסקר יכול לבצע פעולה זו'),
          404: R.notFound,
          409: errorResponse('הסקר כבר אושר, או שכבר הצביעו בו', 'POLL_LOCKED', 'אי אפשר לערוך סקר שכבר אושר'),
        },
      },
      delete: {
        tags: ['Polls'],
        summary: 'מחיקת סקר (מנהל - תמיד; יוצר - כל עוד אין הצבעות)',
        description: 'מנהל יכול למחוק כל סקר, והצבעות הסקר נמחקות איתו. היוצר יכול למחוק סקר בכל סטטוס כל עוד אין בו הצבעות.',
        security: bearer,
        responses: {
          204: { description: 'הסקר נמחק' },
          400: R.validation,
          401: R.unauthorized,
          403: errorResponse('המשתמש אינו יוצר הסקר ואינו מנהל', 'FORBIDDEN', 'רק יוצר הסקר יכול לבצע פעולה זו'),
          404: R.notFound,
          409: errorResponse('כבר הצביעו בסקר', 'POLL_HAS_VOTES', 'אי אפשר למחוק סקר שכבר הצביעו בו'),
        },
      },
    },
    '/api/polls/{id}/close': {
      parameters: [idParam],
      post: {
        tags: ['Polls'],
        summary: 'סגירה מוקדמת של סקר (יוצר בלבד)',
        security: bearer,
        responses: {
          200: { description: 'הסקר נסגר', content: json('PollDetails') },
          401: R.unauthorized,
          403: errorResponse('המשתמש אינו יוצר הסקר', 'FORBIDDEN', 'רק יוצר הסקר יכול לסגור אותו'),
          404: R.notFound,
          409: errorResponse('הסקר לא פתוח', 'POLL_NOT_OPEN', 'אפשר לסגור רק סקר מאושר שעדיין פתוח'),
        },
      },
    },
    '/api/polls/{id}/votes': {
      parameters: [idParam],
      post: {
        tags: ['Votes'],
        summary: 'הצבעה בסקר (פעם אחת, סופית)',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VoteRequest' },
              examples: {
                single: { summary: 'בחירה אחת', value: { optionIds: [1] } },
                multiple: { summary: 'כמה שאלות - תשובה לכל שאלה (בשאלה עם allowMultiple אפשר כמה)', value: { optionIds: [1, 4, 5] } },
              },
            },
          },
        },
        responses: {
          201: { description: 'ההצבעה נקלטה - מוחזרים פרטי הסקר המעודכנים', content: json('PollDetails', pollDetailsExample) },
          400: R.validation,
          401: R.unauthorized,
          404: R.notFound,
          409: errorResponse('כבר הצבעת / הסקר סגור', 'ALREADY_VOTED', 'כבר הצבעת בסקר הזה - הצבעה היא סופית'),
        },
      },
    },
    '/api/polls/{id}/results': {
      parameters: [idParam],
      get: {
        tags: ['Votes'],
        summary: 'תוצאות הסקר (לדיאגרמה)',
        description: 'זמין רק אחרי שהמשתמש הצביע או אחרי שהסקר נסגר. אף פעם לא מוצג מי הצביע למה.',
        security: bearer,
        responses: {
          200: { description: 'התוצאות', content: json('PollResults') },
          401: R.unauthorized,
          403: errorResponse('התוצאות עדיין נעולות', 'RESULTS_LOCKED', 'התוצאות יוצגו אחרי שתצביעי או אחרי שהסקר ייסגר'),
          404: R.notFound,
        },
      },
    },
    '/api/admin/polls': {
      get: {
        tags: ['Admin'],
        summary: 'כל הסקרים לניהול (כולל ממתינים ומוסתרים)',
        description: 'status=PENDING מחזיר את תור האישורים - הוותיקים קודם.',
        security: bearer,
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/PollStatus' } },
          { name: 'hidden', in: 'query', description: 'true = רק מוסתרים, false = רק גלויים', schema: { type: 'boolean' } },
          searchParam,
          ...pageParams,
        ],
        responses: {
          200: { description: 'רשימת סקרים', content: json('AdminPollList') },
          400: R.validation,
          401: R.unauthorized,
          403: R.adminOnly,
        },
      },
    },
    '/api/admin/polls/{id}/approve': {
      parameters: [idParam],
      post: {
        tags: ['Admin'],
        summary: 'אישור סקר ממתין או נדחה',
        security: bearer,
        responses: {
          200: { description: 'הסקר אושר', content: json('PollDetails') },
          401: R.unauthorized,
          403: R.adminOnly,
          404: R.notFound,
          409: errorResponse('הסקר כבר מאושר, או שתאריך הסגירה עבר', 'INVALID_STATUS', 'הסקר כבר מאושר'),
        },
      },
    },
    '/api/admin/polls/{id}/reject': {
      parameters: [idParam],
      post: {
        tags: ['Admin'],
        summary: 'דחיית סקר ממתין או מאושר (סיבה חובה)',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: { reason: { type: 'string', minLength: 1, maxLength: 300 } },
              },
              example: { reason: 'השאלה לא ברורה, נא לנסח מחדש' },
            },
          },
        },
        responses: {
          200: { description: 'הסקר נדחה', content: json('PollDetails') },
          400: R.validation,
          401: R.unauthorized,
          403: R.adminOnly,
          404: R.notFound,
          409: errorResponse('הסקר כבר נדחה', 'INVALID_STATUS', 'הסקר כבר נדחה'),
        },
      },
    },
    '/api/admin/polls/{id}/visibility': {
      parameters: [idParam],
      patch: {
        tags: ['Admin'],
        summary: 'הסתרת סקר מאושר / החזרתו לתצוגה',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isHidden'],
                properties: { isHidden: { type: 'boolean' } },
              },
              example: { isHidden: true },
            },
          },
        },
        responses: {
          200: { description: 'עודכן', content: json('PollDetails') },
          400: R.validation,
          401: R.unauthorized,
          403: R.adminOnly,
          404: R.notFound,
          409: errorResponse('הסקר לא מאושר', 'INVALID_STATUS', 'אפשר להסתיר רק סקר שאושר'),
        },
      },
    },
  },
};
