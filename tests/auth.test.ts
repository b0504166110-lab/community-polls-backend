import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, createUser, PASSWORD, prisma, resetDb } from './helpers';

beforeEach(resetDb);

describe('POST /api/auth/register', () => {
  it('נרשמת, מקבלת Token, ונוצרת תמיד כמשתמש רגיל', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'מיכל', email: 'Michal@Example.com', password: 'Michal1234', role: 'ADMIN' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'מיכל', email: 'michal@example.com', role: 'USER' });
    expect(res.body.user.passwordHash).toBeUndefined();

    const saved = await prisma.user.findUnique({ where: { email: 'michal@example.com' } });
    expect(saved?.passwordHash).not.toBe('Michal1234');
    expect(saved?.passwordHash.startsWith('$2')).toBe(true);
  });

  it('מחזירה 409 כשהאימייל כבר רשום', async () => {
    const body = { name: 'מיכל', email: 'dup@example.com', password: 'Michal1234' };
    await api().post('/api/auth/register').send(body).expect(201);
    const res = await api().post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('מחזירה 400 על נתונים לא תקינים, עם פירוט השדות', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'א', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('מחזירה 400 על JSON שבור', async () => {
    const res = await api().post('/api/auth/register').set('Content-Type', 'application/json').send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('POST /api/auth/login', () => {
  it('Login תקין מחזיר JWT ופרטי משתמש בלי סיסמה', async () => {
    const { user } = await createUser();
    const res = await api().post('/api/auth/login').send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'USER',
      createdAt: expect.any(String),
    });
    const decoded = jwt.decode(res.body.token) as jwt.JwtPayload;
    expect(decoded.sub).toBe(String(user.id));
    expect(decoded.exp).toBeGreaterThan(decoded.iat!);
  });

  it('סיסמה שגויה מחזירה 401', async () => {
    const { user } = await createUser();
    const res = await api().post('/api/auth/login').send({ email: user.email, password: 'Wrong12345' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('אימייל שלא קיים מחזיר 401 עם אותה הודעה', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('אימייל או סיסמה שגויים');
  });
});

describe('GET /api/auth/me', () => {
  it('מחזירה את המשתמש לפי ה-Token', async () => {
    const { user, auth } = await createUser('ADMIN', 'מנהלת');
    const res = await api().get('/api/auth/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, role: 'ADMIN', name: 'מנהלת' });
  });

  it('בלי Token - 401', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Token לא תקין - 401', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('Token שנחתם במפתח אחר - 401', async () => {
    const { user } = await createUser();
    const forged = jwt.sign({ role: 'ADMIN' }, 'another-secret-another-secret-another-secret', { subject: String(user.id) });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('Token שפג תוקפו - 401 עם TOKEN_EXPIRED', async () => {
    const { user } = await createUser();
    const expired = jwt.sign({ role: 'USER' }, process.env.JWT_SECRET!, {
      subject: String(user.id),
      expiresIn: -10,
    });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('כותרת Authorization בפורמט שגוי - 401', async () => {
    const { token } = await createUser();
    const res = await api().get('/api/auth/me').set('Authorization', `Token ${token}`);
    expect(res.status).toBe(401);
  });

  it('Token של משתמש שנמחק - 401', async () => {
    const { user, auth } = await createUser();
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api().get('/api/auth/me').set('Authorization', auth);
    expect(res.status).toBe(401);
  });
});
