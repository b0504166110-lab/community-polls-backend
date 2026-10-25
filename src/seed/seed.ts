import 'dotenv/config';
import { PrismaClient, type PollCategory, type PollStatus } from '@prisma/client';
import { hashPassword } from '../utils/password';

/*
 * נתוני הדגמה (מומצאים).
 * פיתוח: נוצרים מנהל ומשתמשים עם סיסמאות ידועות + סקרים והצבעות.
 * פרודקשן: לא נוצרות סיסמאות ידועות. המנהל נוצר רק מ-SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD,
 *          ונתוני הדגמה נוצרים רק אם הוגדרה SEED_DEMO_PASSWORD.
 * אפשר להריץ שוב ושוב - נתונים קיימים לא משוכפלים.
 */

const DEV_ADMIN_PASSWORD = 'Admin1234!';
const DEV_USER_PASSWORD = 'User1234!';

const DAY = 24 * 60 * 60 * 1000;
const fromNow = (days: number) => new Date(Date.now() + days * DAY);

interface DemoPoll {
  title: string;
  description?: string;
  category: PollCategory;
  closesInDays: number;
  status: PollStatus;
  rejectionReason?: string;
  isHidden?: boolean;
  closedEarly?: boolean;
  creator: 'admin' | 'noa' | 'yossi' | 'dana';
  questions: { text: string; allowMultiple?: boolean; options: string[] }[];
  // לכל מצביע - לכל שאלה (לפי הסדר), מיקומי האפשרויות שבחר (מתחילים מ-1)
  votes?: Partial<Record<'admin' | 'noa' | 'yossi' | 'dana', number[][]>>;
}

const DEMO_POLLS: DemoPoll[] = [
  {
    title: 'ערב סרט אצל דנה בשישי',
    description: 'מביאים פופקורן',
    category: 'ENTERTAINMENT',
    closesInDays: 5,
    status: 'APPROVED',
    creator: 'noa',
    questions: [
      { text: 'איזה סרט נראה?', options: ['קומדיה', 'אקשן', 'דרמה', 'אנימציה'] },
      { text: 'באיזה סטייל לבוש באים?', options: ['פיג׳מות', 'יומיומי', 'מתלבשים לפי נושא הסרט'] },
      { text: 'באיזו שעה נפגשים?', allowMultiple: true, options: ['19:00', '20:00', '21:00'] },
    ],
    votes: { yossi: [[1], [1], [2, 3]], dana: [[1], [3], [2]], admin: [[2], [1], [1, 2]] },
  },
  {
    title: 'אילו ימים נוחים לכם למפגש הקבוצה?',
    description: 'אפשר לסמן כמה ימים',
    category: 'GENERAL',
    closesInDays: 10,
    status: 'APPROVED',
    creator: 'yossi',
    questions: [{ text: 'אילו ימים נוחים לכם?', allowMultiple: true, options: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'] }],
    votes: { noa: [[1, 3]], dana: [[3, 5]], admin: [[3]] },
  },
  {
    title: 'לאן נצא לטיול באביב?',
    description: 'טיול יום בטבע לכל המשפחות',
    category: 'TRIPS',
    closesInDays: 20,
    status: 'APPROVED',
    creator: 'admin',
    questions: [{ text: 'לאן נצא לטיול באביב?', options: ['עין גדי', 'רמת הגולן', 'מכתש רמון'] }],
    votes: { noa: [[2]] },
  },
  {
    title: 'איזו פיצה מזמינים לערב המשחקים?',
    category: 'FOOD',
    closesInDays: -3,
    status: 'APPROVED',
    creator: 'dana',
    questions: [{ text: 'איזו פיצה מזמינים לערב המשחקים?', options: ['מרגריטה', 'פטריות', 'זיתים ובצל', 'טבעונית'] }],
    votes: { noa: [[1]], yossi: [[2]], admin: [[1]] },
  },
  {
    title: 'איזה ספורט נעשה ביחד בשבת בבוקר?',
    category: 'SPORT',
    closesInDays: 7,
    status: 'APPROVED',
    closedEarly: true,
    creator: 'noa',
    questions: [{ text: 'איזה ספורט נעשה ביחד בשבת בבוקר?', options: ['ריצה בפארק', 'כדורעף בחוף', 'רכיבה על אופניים'] }],
    votes: { dana: [[2]], yossi: [[2]] },
  },
  {
    title: 'איזה קינוח נכין למסיבת סוף השנה?',
    description: 'מחכה לאישור המנהל',
    category: 'FOOD',
    closesInDays: 14,
    status: 'PENDING',
    creator: 'noa',
    questions: [{ text: 'איזה קינוח נכין למסיבת סוף השנה?', options: ['עוגת שוקולד', 'סלט פירות', 'גלידה'] }],
  },
  {
    title: 'מה דעתכם?',
    category: 'GENERAL',
    closesInDays: 14,
    status: 'REJECTED',
    rejectionReason: 'השאלה לא ברורה, נא לנסח מחדש',
    creator: 'yossi',
    questions: [{ text: 'מה דעתכם?', options: ['כן', 'לא'] }],
  },
  {
    title: 'סקר שהוסתר על ידי המנהל',
    description: 'דוגמה לסקר מוסתר - רק המנהל והיוצר רואים אותו',
    category: 'ENTERTAINMENT',
    closesInDays: 9,
    status: 'APPROVED',
    isHidden: true,
    creator: 'yossi',
    questions: [{ text: 'סקר שהוסתר על ידי המנהל', options: ['אפשרות א', 'אפשרות ב'] }],
  },
];

async function upsertUser(
  prisma: PrismaClient,
  data: { email: string; name: string; password: string; role: 'USER' | 'ADMIN' },
) {
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // לא דורסים סיסמה קיימת; רק מוודאים שהמנהל נשאר מנהל
    if (data.role === 'ADMIN' && existing.role !== 'ADMIN') {
      return prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { email, name: data.name, role: data.role, passwordHash: await hashPassword(data.password) },
  });
}

export async function seed(prisma: PrismaClient) {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME?.trim() || 'מנהל האתר';
  const demoPassword = process.env.SEED_DEMO_PASSWORD;

  for (const [name, value] of [['SEED_ADMIN_PASSWORD', adminPassword], ['SEED_DEMO_PASSWORD', demoPassword]] as const) {
    if (value && value.length < 8) {
      throw new Error(`${name} חייבת להכיל לפחות 8 תווים`);
    }
  }

  let admin = null;
  if (adminEmail && adminPassword) {
    admin = await upsertUser(prisma, { email: adminEmail, name: adminName, password: adminPassword, role: 'ADMIN' });
    console.log(`👑 מנהל: ${admin.email}`);
  } else if (!isProduction) {
    admin = await upsertUser(prisma, { email: 'admin@example.com', name: adminName, password: DEV_ADMIN_PASSWORD, role: 'ADMIN' });
    console.log(`👑 מנהל הדגמה: admin@example.com / ${DEV_ADMIN_PASSWORD}`);
  } else {
    console.log('ℹ️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD לא הוגדרו - לא נוצר מנהל');
  }

  const userPassword = isProduction ? demoPassword : demoPassword || DEV_USER_PASSWORD;
  if (!userPassword) {
    console.log('ℹ️  SEED_DEMO_PASSWORD לא הוגדרה - לא נוצרו נתוני הדגמה');
    return;
  }

  const noa = await upsertUser(prisma, { email: 'noa@example.com', name: 'נועה כהן', password: userPassword, role: 'USER' });
  const yossi = await upsertUser(prisma, { email: 'yossi@example.com', name: 'יוסי לוי', password: userPassword, role: 'USER' });
  const dana = await upsertUser(prisma, { email: 'dana@example.com', name: 'דנה מזרחי', password: userPassword, role: 'USER' });
  console.log(`👤 משתמשי הדגמה: noa@example.com, yossi@example.com, dana@example.com${isProduction ? '' : ` / ${userPassword}`}`);

  if ((await prisma.poll.count()) > 0) {
    console.log('ℹ️  כבר קיימים סקרים - נתוני ההדגמה לא נוספו שוב');
    return;
  }

  const users = { admin: admin ?? noa, noa, yossi, dana };

  for (const demo of DEMO_POLLS) {
    const poll = await prisma.poll.create({
      data: {
        title: demo.title,
        description: demo.description ?? null,
        category: demo.category,
        closesAt: fromNow(demo.closesInDays),
        status: demo.status,
        rejectionReason: demo.rejectionReason ?? null,
        isHidden: demo.isHidden ?? false,
        closedEarlyAt: demo.closedEarly ? fromNow(-1) : null,
        creatorId: users[demo.creator].id,
        questions: {
          create: demo.questions.map((q, qi) => ({
            text: q.text,
            allowMultiple: q.allowMultiple ?? false,
            position: qi + 1,
            options: { create: q.options.map((text, i) => ({ text, position: i + 1 })) },
          })),
        },
      },
      include: { questions: { orderBy: { position: 'asc' }, include: { options: true } } },
    });

    for (const [voter, positions] of Object.entries(demo.votes ?? {})) {
      const user = users[voter as keyof typeof users];
      await prisma.vote.create({
        data: {
          pollId: poll.id,
          userId: user.id,
          choices: {
            create: (positions ?? []).flatMap((questionPositions, qi) =>
              questionPositions.map((pos) => ({
                optionId: poll.questions[qi]!.options.find((o) => o.position === pos)!.id,
              })),
            ),
          },
        },
      });
    }
  }
  console.log(`🗳️  נוצרו ${DEMO_POLLS.length} סקרי הדגמה`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => console.log('✅ ה-Seed הסתיים'))
    .catch((err) => {
      console.error('❌ ה-Seed נכשל:', err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
