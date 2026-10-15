import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'INVALID_TOKEN', 'כותרת Authorization חייבת להיות בפורמט: Bearer <token>');
  }
  return token;
}

async function loadUser(token: string) {
  let userId: number;
  try {
    ({ userId } = verifyToken(token));
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'פג תוקף ההתחברות - יש להתחבר מחדש');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Token לא תקין');
  }

  // התפקיד נלקח ממסד הנתונים ולא מה-Token, כך ששינוי תפקיד נכנס לתוקף מיד
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    throw new AppError(401, 'INVALID_TOKEN', 'המשתמש של ה-Token לא קיים');
  }
  return user;
}

// חובה להיות מחוברים
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    throw AppError.unauthorized();
  }
  req.user = await loadUser(token);
  next();
}

// התחברות אופציונלית: אורח ממשיך, אבל Token שנשלח חייב להיות תקין
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (token) {
    req.user = await loadUser(token);
  }
  next();
}

// בדיקת תפקיד - יש להשתמש אחרי authenticate
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden('פעולה זו מותרת למנהל בלבד');
    }
    next();
  };
}
