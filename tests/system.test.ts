import SwaggerParser from '@apidevtools/swagger-parser';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openApiSpec } from '../src/docs/openapi';
import { app, api, createPoll, createUser, prisma, resetDb } from './helpers';

describe('Health ו-404', () => {
  it('GET /api/health מחזיר ok כשמסד הנתונים מחובר', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('כתובת שלא קיימת מחזירה 404 בפורמט JSON', async () => {
    const res = await api().get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('GET /api/categories מחזיר את הקטגוריות בעברית', async () => {
    const res = await api().get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ value: 'FOOD', label: 'אוכל' });
    expect(res.body).toHaveLength(5);
  });

  it('CORS מאפשר את כתובת האתר המוגדרת', async () => {
    const res = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const blocked = await api().get('/api/health').set('Origin', 'http://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Swagger / OpenAPI', () => {
  it('המסמך הוא OpenAPI 3 תקין', async () => {
    const copy = structuredClone(openApiSpec);
    await expect(SwaggerParser.validate(copy as never)).resolves.toBeTruthy();
  });

  it('מוגדר Bearer JWT (כפתור Authorize)', () => {
    expect(openApiSpec.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  });

  const documented = Object.entries(openApiSpec.paths).flatMap(([path, item]) =>
    Object.keys(item)
      .filter((k) => ['get', 'post', 'put', 'patch', 'delete'].includes(k))
      .map((method) => ({ method: method as 'get' | 'post' | 'put' | 'patch' | 'delete', path })),
  );

  it('כל 17 ה-Endpoints מהאפיון מתועדים', () => {
    expect(documented.map((d) => `${d.method.toUpperCase()} ${d.path}`).sort()).toEqual(
      [
        'GET /api/health',
        'GET /api/categories',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/me',
        'GET /api/polls',
        'POST /api/polls',
        'GET /api/polls/{id}',
        'PUT /api/polls/{id}',
        'DELETE /api/polls/{id}',
        'POST /api/polls/{id}/close',
        'POST /api/polls/{id}/votes',
        'GET /api/polls/{id}/results',
        'GET /api/admin/polls',
        'POST /api/admin/polls/{id}/approve',
        'POST /api/admin/polls/{id}/reject',
        'PATCH /api/admin/polls/{id}/visibility',
      ].sort(),
    );
  });

  it('כל Endpoint שמתועד ב-Swagger באמת קיים בשרת', async () => {
    for (const { method, path } of documented) {
      const res = await api()[method](path.replace('{id}', '1')).send({});
      expect(res.body?.error?.code, `${method.toUpperCase()} ${path}`).not.toBe('ROUTE_NOT_FOUND');
    }
  });

  it('כל Endpoint מוגן מסומן ב-Swagger כדורש Token', () => {
    const publicPaths = ['/api/health', '/api/categories', '/api/auth/register', '/api/auth/login'];
    for (const [path, item] of Object.entries(openApiSpec.paths)) {
      for (const [method, op] of Object.entries(item)) {
        if (typeof op !== 'object' || Array.isArray(op) || !('security' in op)) continue;
        const security = (op as { security: object[] }).security;
        if (publicPaths.includes(path)) {
          expect(security, `${method} ${path}`).toEqual([]);
        } else {
          expect(security.some((s) => 'bearerAuth' in s), `${method} ${path}`).toBe(true);
        }
      }
    }
  });

  it('/api-docs מגיש את Swagger UI ו-/api-docs/openapi.json מגיש את המסמך', async () => {
    const ui = await api().get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');

    const doc = await api().get('/api-docs/openapi.json');
    expect(doc.status).toBe(200);
    expect(doc.body.openapi).toBe('3.0.3');
  });

  it('הקובץ docs/openapi.json מעודכן ותואם לקוד', () => {
    const file = JSON.parse(readFileSync(join(__dirname, '..', 'docs', 'openapi.json'), 'utf8'));
    expect(file).toEqual(JSON.parse(JSON.stringify(openApiSpec)));
  });

  it('האפליקציה נוצרת', () => {
    expect(app).toBeTruthy();
  });
});

describe('Prisma ומסד הנתונים', () => {
  it('אילוץ ייחודי מונע הצבעה כפולה ברמת מסד הנתונים', async () => {
    await resetDb();
    const owner = await createUser();
    const poll = await createPoll(owner.user.id);
    await prisma.vote.create({ data: { pollId: poll.id, userId: owner.user.id } });
    await expect(prisma.vote.create({ data: { pollId: poll.id, userId: owner.user.id } })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('אילוץ CHECK חוסם כותרת קצרה מדי גם בלי השרת', async () => {
    await resetDb();
    const owner = await createUser();
    await expect(createPoll(owner.user.id, { title: 'קצר' })).rejects.toThrow(/Poll_title_length/);
  });

  it('אימייל ייחודי', async () => {
    await resetDb();
    const { user } = await createUser();
    await expect(prisma.user.create({ data: { name: 'כפול', email: user.email, passwordHash: 'x' } })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('אין Migrations שלא הוחלו (הסכמה תואמת)', async () => {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    const migrationDirs = readdirSync(join(__dirname, '../prisma/migrations'), { withFileTypes: true }).filter((d) => d.isDirectory());
    expect(Number(rows[0]!.count)).toBe(migrationDirs.length);
  });
});
