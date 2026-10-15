import type { Request } from 'express';
import type { AuthUser } from '../types/express';
import { AppError } from '../utils/AppError';
import { idParamSchema } from '../validation/common.schemas';

// המשתמש המחובר (נקבע ב-authenticate לפי ה-Token בלבד)
export function requireUser(req: Request): AuthUser {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user;
}

export function parseId(req: Request): number {
  return idParamSchema.parse(req.params).id;
}
