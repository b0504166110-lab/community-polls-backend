import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

function send(res: Response, status: number, code: string, message: string, details?: unknown) {
  res.status(status).json({ error: { code, message, ...(details !== undefined && { details }) } });
}

// טיפול מרוכז בכל השגיאות - כל שגיאה מוחזרת באותו מבנה JSON
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return send(res, err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.') || null,
      message: issue.message,
    }));
    return send(res, 400, 'VALIDATION_ERROR', 'הנתונים שנשלחו אינם תקינים', details);
  }

  // JSON שבור או גוף בקשה גדול מדי (שגיאות של express.json)
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type: string }).type;
    if (type === 'entity.parse.failed') {
      return send(res, 400, 'INVALID_JSON', 'גוף הבקשה אינו JSON תקין');
    }
    if (type === 'entity.too.large') {
      return send(res, 413, 'PAYLOAD_TOO_LARGE', 'גוף הבקשה גדול מדי');
    }
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return send(res, 409, 'CONFLICT', 'הרשומה כבר קיימת');
    }
    if (err.code === 'P2025') {
      return send(res, 404, 'NOT_FOUND', 'המשאב המבוקש לא נמצא');
    }
  }

  if (!env.isTest) {
    console.error('Unhandled error:', err);
  }
  return send(res, 500, 'INTERNAL_ERROR', 'אירעה שגיאה בשרת');
}

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, 'ROUTE_NOT_FOUND', `הכתובת ${req.method} ${req.path} לא קיימת`);
}
