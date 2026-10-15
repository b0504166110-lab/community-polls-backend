import type { User } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { hashPassword, hashPasswordSync, verifyPassword } from '../utils/password';
import type { LoginInput, RegisterInput } from '../validation/auth.schemas';

// Hash קבוע להשוואה כשהאימייל לא קיים - כדי שזמן התגובה לא יסגיר אילו אימיילים רשומים
const DUMMY_HASH = hashPasswordSync('dummy-password-for-timing');

// המידע הציבורי על משתמש - בלי Hash של הסיסמה
export function toPublicUser(user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('EMAIL_TAKEN', 'כתובת האימייל כבר רשומה במערכת');
  }

  // הרשמה עצמית תמיד יוצרת משתמש רגיל - אי אפשר להירשם כמנהל
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'USER',
    },
  });

  return { token: signToken(user.id, user.role), user: toPublicUser(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'אימייל או סיסמה שגויים');
  }

  return { token: signToken(user.id, user.role), user: toPublicUser(user) };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw AppError.unauthorized();
  }
  return toPublicUser(user);
}
