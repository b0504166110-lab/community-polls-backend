import { beforeEach, describe, expect, it } from 'vitest';
import { api, createPoll, createUser, futureDate, prisma, questionBody, resetDb, validPollBody } from './helpers';

beforeEach(resetDb);

describe('יצירת סקר - POST /api/polls', () => {
  it('משתמש רגיל יוצר סקר שממתין לאישור', async () => {
    const { user, auth } = await createUser();
    const res = await api().post('/api/polls').set('Authorization', auth).send(validPollBody());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'איזה סרט נראה בשישי?',
      category: 'ENTERTAINMENT',
      categoryLabel: 'בילויים',
      status: 'PENDING',
      isOpen: false,
      creator: { id: user.id },
      permissions: { canEdit: true, canDelete: true, canVote: false },
    });
    expect(res.body.questionCount).toBe(1);
    expect(res.body.questions[0]).toMatchObject({ text: 'איזה סרט נראה?', allowMultiple: false, position: 1 });
    expect(res.body.questions[0].options.map((o: { text: string }) => o.text)).toEqual(['קומדיה', 'אקשן', 'דרמה']);
  });

  it('סקר עם כמה שאלות - כל שאלה עם האפשרויות שלה, לפי הסדר', async () => {
    const { auth } = await createUser();
    const res = await api()
      .post('/api/polls')
      .set('Authorization', auth)
      .send(
        validPollBody({
          title: 'ערב סרט אצל דנה',
          questions: [
            questionBody(),
            questionBody({ text: 'באיזה סטייל לבוש באים?', options: ['פיג׳מות', 'יומיומי'] }),
            questionBody({ text: 'באיזו שעה נפגשים?', allowMultiple: true, options: ['19:00', '20:00', '21:00'] }),
          ],
        }),
      );

    expect(res.status).toBe(201);
    expect(res.body.questionCount).toBe(3);
    expect(res.body.questions.map((q: { text: string; allowMultiple: boolean }) => [q.text, q.allowMultiple])).toEqual([
      ['איזה סרט נראה?', false],
      ['באיזה סטייל לבוש באים?', false],
      ['באיזו שעה נפגשים?', true],
    ]);
    expect(res.body.questions[1].options.map((o: { text: string }) => o.text)).toEqual(['פיג׳מות', 'יומיומי']);
  });

  it('סקר של מנהל מאושר אוטומטית', async () => {
    const { auth } = await createUser('ADMIN');
    const res = await api().post('/api/polls').set('Authorization', auth).send(validPollBody());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.isOpen).toBe(true);
  });

  it('אי אפשר לקבוע את היוצר או הסטטוס מהלקוח', async () => {
    const { user, auth } = await createUser();
    const other = await createUser();
    const res = await api()
      .post('/api/polls')
      .set('Authorization', auth)
      .send({ ...validPollBody(), creatorId: other.user.id, status: 'APPROVED' });
    expect(res.status).toBe(201);
    expect(res.body.creator.id).toBe(user.id);
    expect(res.body.status).toBe('PENDING');
  });

  it('בלי Token - 401', async () => {
    const res = await api().post('/api/polls').send(validPollBody());
    expect(res.status).toBe(401);
  });

  it.each([
    ['כותרת קצרה מדי', { title: 'אבג' }, 'title'],
    ['קטגוריה לא קיימת', { category: 'MUSIC' }, 'category'],
    ['תאריך סגירה בעבר', { closesAt: '2020-01-01T00:00:00.000Z' }, 'closesAt'],
    ['תאריך סגירה מעל שנה', { closesAt: futureDate(400) }, 'closesAt'],
    ['תאריך לא תקין', { closesAt: 'מחר' }, 'closesAt'],
    ['אפשרות אחת בלבד', { questions: [questionBody({ options: ['רק אחת'] })] }, 'questions.0.options'],
    ['יותר מ-6 אפשרויות', { questions: [questionBody({ options: ['1', '2', '3', '4', '5', '6', '7'] })] }, 'questions.0.options'],
    ['אפשרויות כפולות', { questions: [questionBody({ options: ['כן', 'כן'] })] }, 'questions.0.options'],
    ['אפשרות ריקה', { questions: [questionBody({ options: ['כן', '   '] })] }, 'questions.0.options.1'],
    ['allowMultiple לא בוליאני', { questions: [questionBody({ allowMultiple: 'yes' })] }, 'questions.0.allowMultiple'],
    ['שאלה ריקה', { questions: [questionBody(), questionBody({ text: ' ' })] }, 'questions.1.text'],
    ['בלי שאלות', { questions: [] }, 'questions'],
    ['יותר מ-10 שאלות', { questions: Array.from({ length: 11 }, () => questionBody()) }, 'questions'],
  ])('Validation: %s - 400', async (_name, override, field) => {
    const { auth } = await createUser();
    const res = await api().post('/api/polls').set('Authorization', auth).send(validPollBody(override));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('שדות חובה חסרים - 400', async () => {
    const { auth } = await createUser();
    const res = await api().post('/api/polls').set('Authorization', auth).send({});
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'category', 'closesAt', 'questions']));
  });
});

describe('צפייה בסקרים ומניעת גישה', () => {
  it('אורח רואה רק סקרים מאושרים וגלויים', async () => {
    const { user } = await createUser();
    await createPoll(user.id, { title: 'סקר מאושר וגלוי' });
    await createPoll(user.id, { title: 'סקר שממתין לאישור', status: 'PENDING' });
    await createPoll(user.id, { title: 'סקר שנדחה על ידי מנהל', status: 'REJECTED' });
    await createPoll(user.id, { title: 'סקר מוסתר על ידי מנהל', isHidden: true });

    const res = await api().get('/api/polls');
    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { title: string }) => p.title)).toEqual(['סקר מאושר וגלוי']);
    expect(res.body).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });

  it('סקר ממתין של אחר מחזיר 404, ליוצר ולמנהל 200', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const admin = await createUser('ADMIN');
    const poll = await createPoll(owner.user.id, { status: 'PENDING' });

    expect((await api().get(`/api/polls/${poll.id}`)).status).toBe(404);
    expect((await api().get(`/api/polls/${poll.id}`).set('Authorization', stranger.auth)).status).toBe(404);
    expect((await api().get(`/api/polls/${poll.id}`).set('Authorization', owner.auth)).status).toBe(200);
    expect((await api().get(`/api/polls/${poll.id}`).set('Authorization', admin.auth)).status).toBe(200);
  });

  it('סיבת דחייה גלויה רק ליוצר', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id, { status: 'REJECTED', rejectionReason: 'לא ברור' });
    const res = await api().get(`/api/polls/${poll.id}`).set('Authorization', owner.auth);
    expect(res.body.rejectionReason).toBe('לא ברור');
  });

  it('אורח לא מקבל את האימייל של היוצר', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id);
    const res = await api().get(`/api/polls/${poll.id}`);
    expect(res.status).toBe(200);
    expect(res.body.creator).toEqual({ id: owner.user.id, name: owner.user.name });
    expect(res.body.permissions).toEqual({
      canVote: false,
      canSeeResults: false,
      canEdit: false,
      canDelete: false,
      canClose: false,
    });
  });

  it('מזהה לא תקין - 400, סקר שלא קיים - 404', async () => {
    expect((await api().get('/api/polls/abc')).status).toBe(400);
    expect((await api().get('/api/polls/99999')).status).toBe(404);
  });

  it('Token לא תקין גם ב-Endpoint ציבורי - 401', async () => {
    const res = await api().get('/api/polls').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });
});

describe('חיפוש, סינון ומיון - GET /api/polls', () => {
  async function setup() {
    const a = await createUser();
    const b = await createUser();
    const pizza = await createPoll(a.user.id, { title: 'איזו פיצה נזמין?', category: 'FOOD', closesAt: new Date(Date.now() + 2 * 86400000) });
    const trip = await createPoll(b.user.id, { title: 'לאן נצא לטיול?', category: 'TRIPS', description: 'טיול עם פיצה בסוף', closesAt: new Date(Date.now() + 9 * 86400000) });
    const closed = await createPoll(a.user.id, { title: 'סקר ישן שנסגר', closesAt: new Date(Date.now() - 86400000) });
    const early = await createPoll(b.user.id, { title: 'סקר שנסגר מוקדם', closedEarlyAt: new Date() });
    const pending = await createPoll(a.user.id, { title: 'סקר שלי שממתין', status: 'PENDING' });
    // שני מצביעים בטיול, אחד בפיצה
    await prisma.vote.create({ data: { pollId: trip.id, userId: a.user.id, choices: { create: [{ optionId: trip.options[0]!.id }] } } });
    await prisma.vote.create({ data: { pollId: trip.id, userId: b.user.id, choices: { create: [{ optionId: trip.options[1]!.id }] } } });
    await prisma.vote.create({ data: { pollId: pizza.id, userId: b.user.id, choices: { create: [{ optionId: pizza.options[0]!.id }] } } });
    return { a, b, pizza, trip, closed, early, pending };
  }

  const titles = (res: { body: { items: { title: string }[] } }) => res.body.items.map((p) => p.title);

  it('חיפוש בכותרת ובתיאור', async () => {
    await setup();
    const res = await api().get('/api/polls').query({ search: 'פיצה' });
    expect(titles(res).sort()).toEqual(['איזו פיצה נזמין?', 'לאן נצא לטיול?'].sort());
  });

  it('סינון לפי קטגוריה', async () => {
    await setup();
    const res = await api().get('/api/polls').query({ category: 'TRIPS' });
    expect(titles(res)).toEqual(['לאן נצא לטיול?']);
  });

  it('סינון פתוחים / סגורים', async () => {
    await setup();
    const open = await api().get('/api/polls').query({ state: 'open' });
    expect(titles(open).sort()).toEqual(['איזו פיצה נזמין?', 'לאן נצא לטיול?'].sort());
    const closed = await api().get('/api/polls').query({ state: 'closed' });
    expect(titles(closed).sort()).toEqual(['סקר ישן שנסגר', 'סקר שנסגר מוקדם'].sort());
    expect(closed.body.items.every((p: { isOpen: boolean }) => !p.isOpen)).toBe(true);
  });

  it('"הסקרים שלי" כולל גם ממתינים, ו"הצבעתי" מחזיר רק סקרים שהצבעתי בהם', async () => {
    const { a, b } = await setup();
    const mine = await api().get('/api/polls').query({ mine: true }).set('Authorization', a.auth);
    expect(titles(mine).sort()).toEqual(['איזו פיצה נזמין?', 'סקר ישן שנסגר', 'סקר שלי שממתין'].sort());

    const voted = await api().get('/api/polls').query({ voted: true }).set('Authorization', b.auth);
    expect(titles(voted).sort()).toEqual(['איזו פיצה נזמין?', 'לאן נצא לטיול?'].sort());
    expect(voted.body.items.every((p: { hasVoted: boolean }) => p.hasVoted)).toBe(true);
  });

  it('mine בלי התחברות - 401', async () => {
    const res = await api().get('/api/polls').query({ mine: true });
    expect(res.status).toBe(401);
  });

  it('מיון לפי פופולריות ולפי "נסגרים בקרוב"', async () => {
    await setup();
    const popular = await api().get('/api/polls').query({ sort: 'popular' });
    expect(titles(popular).slice(0, 2)).toEqual(['לאן נצא לטיול?', 'איזו פיצה נזמין?']);
    expect(popular.body.items[0].voterCount).toBe(2);

    const soon = await api().get('/api/polls').query({ sort: 'closingSoon' });
    expect(titles(soon)).toEqual(['איזו פיצה נזמין?', 'לאן נצא לטיול?']);
  });

  it('חלוקה לעמודים', async () => {
    await setup();
    const res = await api().get('/api/polls').query({ limit: 2, page: 2 });
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 4, totalPages: 2 });
    expect(res.body.items).toHaveLength(2);
  });

  it('פרמטרים לא תקינים - 400', async () => {
    expect((await api().get('/api/polls').query({ sort: 'random' })).status).toBe(400);
    expect((await api().get('/api/polls').query({ limit: 500 })).status).toBe(400);
    expect((await api().get('/api/polls').query({ category: 'XYZ' })).status).toBe(400);
  });
});

describe('עריכה, מחיקה וסגירה', () => {
  it('היוצר עורך סקר שנדחה - הסקר חוזר לאישור והאפשרויות מתעדכנות', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id, { status: 'REJECTED', rejectionReason: 'לא ברור' });

    const res = await api()
      .put(`/api/polls/${poll.id}`)
      .set('Authorization', owner.auth)
      .send(
        validPollBody({
          title: 'כותרת חדשה וברורה',
          questions: [questionBody({ text: 'מגיעים?', options: ['כן', 'לא'] }), questionBody({ text: 'מביאים משהו?', options: ['שתייה', 'נשנושים'] })],
        }),
      );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'כותרת חדשה וברורה', status: 'PENDING', rejectionReason: null });
    expect(res.body.questions.map((q: { text: string }) => q.text)).toEqual(['מגיעים?', 'מביאים משהו?']);
    expect(res.body.questions[0].options.map((o: { text: string }) => o.text)).toEqual(['כן', 'לא']);
    expect(await prisma.pollQuestion.count({ where: { pollId: poll.id } })).toBe(2);
    expect(await prisma.pollOption.count({ where: { question: { pollId: poll.id } } })).toBe(4);
  });

  it('אי אפשר לערוך סקר שאושר - 409', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id);
    const edit = await api().put(`/api/polls/${poll.id}`).set('Authorization', owner.auth).send(validPollBody());
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('POLL_LOCKED');
  });

  it('היוצר מוחק סקר מאושר שאין בו הצבעות; עם הצבעות - 409', async () => {
    const owner = await createUser();
    const empty = await createPoll(owner.user.id);
    expect((await api().delete(`/api/polls/${empty.id}`).set('Authorization', owner.auth)).status).toBe(204);

    const voted = await createPoll(owner.user.id);
    await prisma.vote.create({ data: { pollId: voted.id, userId: owner.user.id } });
    const del = await api().delete(`/api/polls/${voted.id}`).set('Authorization', owner.auth);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('POLL_HAS_VOTES');
    expect(await prisma.poll.count()).toBe(1);
  });

  it('משתמש אחר לא יכול לערוך, למחוק או לסגור סקר מאושר - 403', async () => {
    const owner = await createUser();
    const other = await createUser();
    const poll = await createPoll(owner.user.id);

    expect((await api().put(`/api/polls/${poll.id}`).set('Authorization', other.auth).send(validPollBody())).status).toBe(403);
    expect((await api().delete(`/api/polls/${poll.id}`).set('Authorization', other.auth)).status).toBe(403);
    expect((await api().post(`/api/polls/${poll.id}/close`).set('Authorization', other.auth)).status).toBe(403);
  });

  it('מנהל שאינו היוצר לא יכול לערוך או לסגור סקר - 403', async () => {
    const owner = await createUser();
    const admin = await createUser('ADMIN');
    const poll = await createPoll(owner.user.id);
    expect((await api().put(`/api/polls/${poll.id}`).set('Authorization', admin.auth).send(validPollBody())).status).toBe(403);
    expect((await api().post(`/api/polls/${poll.id}/close`).set('Authorization', admin.auth)).status).toBe(403);
  });

  it('משתמש אחר מנסה לערוך סקר ממתין שלא שלו - 404 (לא חושפים שהוא קיים)', async () => {
    const owner = await createUser();
    const other = await createUser();
    const poll = await createPoll(owner.user.id, { status: 'PENDING' });
    const res = await api().put(`/api/polls/${poll.id}`).set('Authorization', other.auth).send(validPollBody());
    expect(res.status).toBe(404);
  });

  it('היוצר מוחק סקר ממתין - 204, והאפשרויות נמחקות איתו', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id, { status: 'PENDING' });
    const res = await api().delete(`/api/polls/${poll.id}`).set('Authorization', owner.auth);
    expect(res.status).toBe(204);
    expect(await prisma.poll.count()).toBe(0);
    expect(await prisma.pollQuestion.count()).toBe(0);
    expect(await prisma.pollOption.count()).toBe(0);
  });

  it('היוצר סוגר סקר פתוח מוקדם; סגירה שנייה - 409', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id);
    const res = await api().post(`/api/polls/${poll.id}/close`).set('Authorization', owner.auth);
    expect(res.status).toBe(200);
    expect(res.body.isOpen).toBe(false);
    expect(res.body.closedEarlyAt).toEqual(expect.any(String));

    const again = await api().post(`/api/polls/${poll.id}/close`).set('Authorization', owner.auth);
    expect(again.status).toBe(409);
  });
});
