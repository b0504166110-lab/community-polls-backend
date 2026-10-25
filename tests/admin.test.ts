import { beforeEach, describe, expect, it } from 'vitest';
import { api, createPoll, createUser, prisma, resetDb } from './helpers';

beforeEach(resetDb);

describe('הרשאות מנהל', () => {
  const adminRequests = (id: number) => [
    { method: 'get' as const, url: '/api/admin/polls' },
    { method: 'post' as const, url: `/api/admin/polls/${id}/approve` },
    { method: 'post' as const, url: `/api/admin/polls/${id}/reject`, body: { reason: 'סיבה' } },
    { method: 'patch' as const, url: `/api/admin/polls/${id}/visibility`, body: { isHidden: true } },
  ];

  it('משתמש רגיל מקבל 403 בכל Endpoint של ניהול', async () => {
    const user = await createUser();
    const poll = await createPoll(user.user.id, { status: 'PENDING' });
    for (const r of adminRequests(poll.id)) {
      const res = await api()[r.method](r.url).set('Authorization', user.auth).send(r.body ?? {});
      expect(res.status, `${r.method} ${r.url}`).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('אורח מקבל 401 בכל Endpoint של ניהול', async () => {
    const user = await createUser();
    const poll = await createPoll(user.user.id, { status: 'PENDING' });
    for (const r of adminRequests(poll.id)) {
      const res = await api()[r.method](r.url).send(r.body ?? {});
      expect(res.status, `${r.method} ${r.url}`).toBe(401);
    }
  });
});

describe('ניהול סקרים', () => {
  it('רשימת הניהול כוללת ממתינים ומוסתרים, עם סינון לפי סטטוס', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    await createPoll(user.user.id, { title: 'ממתין ראשון לאישור', status: 'PENDING' });
    await createPoll(user.user.id, { title: 'סקר מוסתר לניהול', isHidden: true });
    await createPoll(user.user.id, { title: 'סקר רגיל ומאושר' });

    const all = await api().get('/api/admin/polls').set('Authorization', admin.auth);
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(3);
    expect(all.body.items[0].creator.email).toBe(user.user.email);

    const pending = await api().get('/api/admin/polls').query({ status: 'PENDING' }).set('Authorization', admin.auth);
    expect(pending.body.items.map((p: { title: string }) => p.title)).toEqual(['ממתין ראשון לאישור']);

    const hidden = await api().get('/api/admin/polls').query({ hidden: true }).set('Authorization', admin.auth);
    expect(hidden.body.items.map((p: { title: string }) => p.title)).toEqual(['סקר מוסתר לניהול']);
  });

  it('אישור סקר ממתין - הסקר מופיע לכולם', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const poll = await createPoll(user.user.id, { status: 'PENDING' });

    const res = await api().post(`/api/admin/polls/${poll.id}/approve`).set('Authorization', admin.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'APPROVED', isOpen: true });

    const publicList = await api().get('/api/polls');
    expect(publicList.body.total).toBe(1);

    const again = await api().post(`/api/admin/polls/${poll.id}/approve`).set('Authorization', admin.auth);
    expect(again.status).toBe(409);
  });

  it('אי אפשר לאשר סקר שתאריך הסגירה שלו עבר', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const poll = await createPoll(user.user.id, { status: 'PENDING', closesAt: new Date(Date.now() - 1000) });
    const res = await api().post(`/api/admin/polls/${poll.id}/approve`).set('Authorization', admin.auth);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('POLL_EXPIRED');
  });

  it('דחייה עם סיבה - היוצר רואה את הסיבה ויכול לערוך', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const poll = await createPoll(user.user.id, { status: 'PENDING' });

    const res = await api()
      .post(`/api/admin/polls/${poll.id}/reject`)
      .set('Authorization', admin.auth)
      .send({ reason: 'השאלה לא ברורה' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'REJECTED', rejectionReason: 'השאלה לא ברורה' });

    const asOwner = await api().get(`/api/polls/${poll.id}`).set('Authorization', user.auth);
    expect(asOwner.body.rejectionReason).toBe('השאלה לא ברורה');
    expect(asOwner.body.permissions.canEdit).toBe(true);
  });

  it('דחייה בלי סיבה, עם סיבה ריקה או ארוכה מדי - 400', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const poll = await createPoll(user.user.id, { status: 'PENDING' });
    const url = `/api/admin/polls/${poll.id}/reject`;
    expect((await api().post(url).set('Authorization', admin.auth)).status).toBe(400);
    expect((await api().post(url).set('Authorization', admin.auth).send({ reason: '   ' })).status).toBe(400);
    expect((await api().post(url).set('Authorization', admin.auth).send({ reason: 'א'.repeat(301) })).status).toBe(400);
  });

  it('אפשר לדחות סקר שאושר, ולאשר סקר שנדחה - ההחלטה הפיכה', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const poll = await createPoll(user.user.id);

    const reject = await api().post(`/api/admin/polls/${poll.id}/reject`).set('Authorization', admin.auth).send({ reason: 'נדחה בדיעבד' });
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe('REJECTED');
    expect((await api().get('/api/polls')).body.total).toBe(0);
    expect((await api().post(`/api/admin/polls/${poll.id}/reject`).set('Authorization', admin.auth).send({ reason: 'שוב' })).status).toBe(409);

    const approve = await api().post(`/api/admin/polls/${poll.id}/approve`).set('Authorization', admin.auth);
    expect(approve.status).toBe(200);
    expect(approve.body).toMatchObject({ status: 'APPROVED', rejectionReason: null });
  });

  it('מנהל מוחק כל סקר, גם מאושר עם הצבעות', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const poll = await createPoll(user.user.id);
    const vote = await prisma.vote.create({ data: { pollId: poll.id, userId: user.user.id } });
    await prisma.voteChoice.create({ data: { voteId: vote.id, optionId: poll.options[0]!.id } });

    const res = await api().delete(`/api/polls/${poll.id}`).set('Authorization', admin.auth);
    expect(res.status).toBe(204);
    expect(await prisma.poll.count()).toBe(0);
    expect(await prisma.vote.count()).toBe(0);
  });

  it('הסתרה והחזרה לתצוגה', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const poll = await createPoll(user.user.id);

    const hide = await api().patch(`/api/admin/polls/${poll.id}/visibility`).set('Authorization', admin.auth).send({ isHidden: true });
    expect(hide.status).toBe(200);
    expect(hide.body).toMatchObject({ isHidden: true, isOpen: false });
    expect((await api().get('/api/polls')).body.total).toBe(0);
    expect((await api().get(`/api/polls/${poll.id}`)).status).toBe(404);

    const show = await api().patch(`/api/admin/polls/${poll.id}/visibility`).set('Authorization', admin.auth).send({ isHidden: false });
    expect(show.body.isHidden).toBe(false);
    expect((await api().get('/api/polls')).body.total).toBe(1);
  });

  it('אי אפשר להסתיר סקר שלא אושר; isHidden חסר - 400', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser();
    const pending = await createPoll(user.user.id, { status: 'PENDING' });
    const approved = await createPoll(user.user.id);
    expect((await api().patch(`/api/admin/polls/${pending.id}/visibility`).set('Authorization', admin.auth).send({ isHidden: true })).status).toBe(409);
    expect((await api().patch(`/api/admin/polls/${approved.id}/visibility`).set('Authorization', admin.auth).send({})).status).toBe(400);
  });

  it('סקר שלא קיים - 404', async () => {
    const admin = await createUser('ADMIN');
    const res = await api().post('/api/admin/polls/99999/approve').set('Authorization', admin.auth);
    expect(res.status).toBe(404);
  });
});
