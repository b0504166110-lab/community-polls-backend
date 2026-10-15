import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { loginSchema, registerSchema } from '../validation/auth.schemas';
import { requireUser } from './helpers';

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body ?? {});
  res.status(201).json(await authService.register(input));
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body ?? {});
  res.json(await authService.login(input));
}

export async function me(req: Request, res: Response) {
  res.json(await authService.getMe(requireUser(req).id));
}
