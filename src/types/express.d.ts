import type { Role } from '@prisma/client';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      // המשתמש המחובר - נקבע אך ורק לפי ה-Token (ב-middleware של האימות)
      user?: AuthUser;
    }
  }
}
