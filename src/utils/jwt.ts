import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(userId: number, role: Role): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign({ role }, env.JWT_SECRET, { ...options, subject: String(userId) });
}

// מחזיר את מזהה המשתמש מתוך Token תקין, או זורק שגיאה (חתימה שגויה / פג תוקף)
export function verifyToken(token: string): { userId: number } {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || !payload.sub) {
    throw new Error('Invalid token payload');
  }
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid token subject');
  }
  return { userId };
}
