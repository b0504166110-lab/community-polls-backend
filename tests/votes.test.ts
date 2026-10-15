import { beforeEach, describe, expect, it } from 'vitest';
import { api, createPoll, createUser, prisma, resetDb } from './helpers';

beforeEach(resetDb);

describe('הצבעה - POST /api/polls/:id/votes', () => {
  it('מצביעה פעם אחת, ההצבעה נשמרת לפי ה-Token', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id);
    const optionId = poll.options[1]!.id;

    const res = await api()
      .post(`/api/polls/${poll.id}/votes`)
      .set('Authorization', voter.auth)
      .send({ optionIds: [optionId], userId: owner.user.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ hasVoted: true, voterCount: 1, myChoices: [optionId] });
    expect(res.body.permissions).toMatchObject({ canVote: false, canSeeResults: true });

    const vote = await prisma.vote.findFirstOrThrow({ include: { choices: true } });
    expect(vote.userId).toBe(voter.user.id);
    expect(vote.choices.map((c) => c.optionId)).toEqual([optionId]);
  });

  it('הצבעה שנייה באותו סקר - 409 (הצבעה סופית)', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id);
    const url = `/api/polls/${poll.id}/votes`;

    await api().post(url).set('Authorization', voter.auth).send({ optionIds: [poll.options[0]!.id] }).expect(201);
    const res = await api().post(url).set('Authorization', voter.auth).send({ optionIds: [poll.options[1]!.id] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_VOTED');
    expect(await prisma.vote.count()).toBe(1);
  });

  it('שתי הצבעות בו-זמנית - רק אחת נקלטת', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id);
    const url = `/api/polls/${poll.id}/votes`;
    const body = { optionIds: [poll.options[0]!.id] };

    const results = await Promise.all([
      api().post(url).set('Authorization', voter.auth).send(body),
      api().post(url).set('Authorization', voter.auth).send(body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.vote.count()).toBe(1);
  });

  it('בסקר רגיל אסור לבחור יותר מתשובה אחת - 400', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id);
    const res = await api()
      .post(`/api/polls/${poll.id}/votes`)
      .set('Authorization', voter.auth)
      .send({ optionIds: [poll.options[0]!.id, poll.options[1]!.id] });
    expect(res.status).toBe(400);
  });

  it('בסקר עם בחירה מרובה אפשר לבחור כמה תשובות', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id, { allowMultiple: true });
    const ids = [poll.options[0]!.id, poll.options[2]!.id];
    const res = await api().post(`/api/polls/${poll.id}/votes`).set('Authorization', voter.auth).send({ optionIds: ids });
    expect(res.status).toBe(201);
    expect(res.body.myChoices.sort()).toEqual(ids.sort());
  });

  it('אפשרות של סקר אחר - 400', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id);
    const otherPoll = await createPoll(owner.user.id);
    const res = await api()
      .post(`/api/polls/${poll.id}/votes`)
      .set('Authorization', voter.auth)
      .send({ optionIds: [otherPoll.options[0]!.id] });
    expect(res.status).toBe(400);
    expect(await prisma.vote.count()).toBe(0);
  });

  it.each([
    ['ריק', { optionIds: [] }],
    ['לא מערך', { optionIds: 5 }],
    ['כפילות', { optionIds: [1, 1] }],
    ['חסר', {}],
  ])('Validation: optionIds %s - 400', async (_name, body) => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id);
    const res = await api().post(`/api/polls/${poll.id}/votes`).set('Authorization', voter.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('סקר סגור / שנסגר מוקדם - 409', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const expired = await createPoll(owner.user.id, { closesAt: new Date(Date.now() - 1000) });
    const early = await createPoll(owner.user.id, { closedEarlyAt: new Date() });
    for (const poll of [expired, early]) {
      const res = await api()
        .post(`/api/polls/${poll.id}/votes`)
        .set('Authorization', voter.auth)
        .send({ optionIds: [poll.options[0]!.id] });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('POLL_CLOSED');
    }
  });

  it('אי אפשר להצביע בסקר ממתין (גם היוצר) או מוסתר', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const pending = await createPoll(owner.user.id, { status: 'PENDING' });
    const hidden = await createPoll(owner.user.id, { isHidden: true });

    const ownPending = await api().post(`/api/polls/${pending.id}/votes`).set('Authorization', owner.auth).send({ optionIds: [pending.options[0]!.id] });
    expect(ownPending.status).toBe(409);
    const strangerHidden = await api().post(`/api/polls/${hidden.id}/votes`).set('Authorization', voter.auth).send({ optionIds: [hidden.options[0]!.id] });
    expect(strangerHidden.status).toBe(404);
  });

  it('אורח לא יכול להצביע - 401', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id);
    const res = await api().post(`/api/polls/${poll.id}/votes`).send({ optionIds: [poll.options[0]!.id] });
    expect(res.status).toBe(401);
  });

  it('מנהל יכול להצביע', async () => {
    const owner = await createUser();
    const admin = await createUser('ADMIN');
    const poll = await createPoll(owner.user.id);
    const res = await api().post(`/api/polls/${poll.id}/votes`).set('Authorization', admin.auth).send({ optionIds: [poll.options[0]!.id] });
    expect(res.status).toBe(201);
  });
});

describe('תוצאות - GET /api/polls/:id/results', () => {
  it('לפני הצבעה התוצאות נעולות (403), אחרי הצבעה מוצגות', async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createPoll(owner.user.id);
    const url = `/api/polls/${poll.id}/results`;

    const locked = await api().get(url).set('Authorization', voter.auth);
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe('RESULTS_LOCKED');

    await api().post(`/api/polls/${poll.id}/votes`).set('Authorization', voter.auth).send({ optionIds: [poll.options[0]!.id] });
    const res = await api().get(url).set('Authorization', voter.auth);
    expect(res.status).toBe(200);
    expect(res.body.totalVoters).toBe(1);
  });

  it('גם יוצר הסקר והמנהל רואים תוצאות רק אחרי הצבעה או סגירה', async () => {
    const owner = await createUser();
    const admin = await createUser('ADMIN');
    const poll = await createPoll(owner.user.id);
    expect((await api().get(`/api/polls/${poll.id}/results`).set('Authorization', owner.auth)).status).toBe(403);
    expect((await api().get(`/api/polls/${poll.id}/results`).set('Authorization', admin.auth)).status).toBe(403);
  });

  it('אחרי שהסקר נסגר - כל מחובר רואה תוצאות; אורח מקבל 401', async () => {
    const owner = await createUser();
    const viewer = await createUser();
    const poll = await createPoll(owner.user.id, { closesAt: new Date(Date.now() - 1000) });
    expect((await api().get(`/api/polls/${poll.id}/results`).set('Authorization', viewer.auth)).status).toBe(200);
    expect((await api().get(`/api/polls/${poll.id}/results`)).status).toBe(401);
  });

  it('חישוב ספירות ואחוזים בבחירה מרובה, בלי לחשוף מי הצביע', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id, { allowMultiple: true, options: ['ראשון', 'שני', 'שלישי'] });
    const [o1, o2, o3] = poll.options;
    const voters = await Promise.all([createUser(), createUser(), createUser()]);
    const picks = [[o1!.id, o2!.id], [o1!.id], [o2!.id]];

    for (let i = 0; i < voters.length; i += 1) {
      await api().post(`/api/polls/${poll.id}/votes`).set('Authorization', voters[i]!.auth).send({ optionIds: picks[i] }).expect(201);
    }

    const res = await api().get(`/api/polls/${poll.id}/results`).set('Authorization', voters[0]!.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalVoters: 3, totalChoices: 4, myChoices: [o1!.id, o2!.id].sort() });
    expect(res.body.options).toEqual([
      { id: o1!.id, text: 'ראשון', count: 2, percent: 66.7 },
      { id: o2!.id, text: 'שני', count: 2, percent: 66.7 },
      { id: o3!.id, text: 'שלישי', count: 0, percent: 0 },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('userId');
    expect(JSON.stringify(res.body)).not.toContain(voters[1]!.user.email);
  });

  it('תוצאות של סקר ממתין - 403 ליוצר', async () => {
    const owner = await createUser();
    const poll = await createPoll(owner.user.id, { status: 'PENDING' });
    const res = await api().get(`/api/polls/${poll.id}/results`).set('Authorization', owner.auth);
    expect(res.status).toBe(403);
  });
});
