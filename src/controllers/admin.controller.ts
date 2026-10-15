import type { Request, Response } from 'express';
import * as adminService from '../services/admin.service';
import { adminListQuerySchema, rejectSchema, visibilitySchema } from '../validation/admin.schemas';
import { parseId, requireUser } from './helpers';

export async function listPolls(req: Request, res: Response) {
  const query = adminListQuerySchema.parse(req.query);
  res.json(await adminService.listAllPolls(query, requireUser(req)));
}

export async function approve(req: Request, res: Response) {
  res.json(await adminService.approvePoll(parseId(req), requireUser(req)));
}

export async function reject(req: Request, res: Response) {
  const id = parseId(req);
  const { reason } = rejectSchema.parse(req.body ?? {});
  res.json(await adminService.rejectPoll(id, reason, requireUser(req)));
}

export async function visibility(req: Request, res: Response) {
  const id = parseId(req);
  const { isHidden } = visibilitySchema.parse(req.body ?? {});
  res.json(await adminService.setVisibility(id, isHidden, requireUser(req)));
}
