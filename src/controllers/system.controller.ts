import type { Request, Response } from 'express';
import { CATEGORY_LABELS } from '../constants/categories';
import { prisma } from '../db/prisma';

export async function health(_req: Request, res: Response) {
  let database: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'error';
  }

  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'error',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

export function categories(_req: Request, res: Response) {
  res.json(Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })));
}
