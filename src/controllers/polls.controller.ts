import type { Request, Response } from 'express';
import * as pollsService from '../services/polls.service';
import * as votesService from '../services/votes.service';
import { listPollsQuerySchema, pollInputSchema, voteSchema } from '../validation/poll.schemas';
import { parseId, requireUser } from './helpers';

export async function list(req: Request, res: Response) {
  const query = listPollsQuerySchema.parse(req.query);
  res.json(await pollsService.listPolls(query, req.user));
}

export async function getById(req: Request, res: Response) {
  res.json(await pollsService.getPoll(parseId(req), req.user));
}

export async function create(req: Request, res: Response) {
  const input = pollInputSchema.parse(req.body ?? {});
  res.status(201).json(await pollsService.createPoll(input, requireUser(req)));
}

export async function update(req: Request, res: Response) {
  const id = parseId(req);
  const input = pollInputSchema.parse(req.body ?? {});
  res.json(await pollsService.updatePoll(id, input, requireUser(req)));
}

export async function remove(req: Request, res: Response) {
  await pollsService.deletePoll(parseId(req), requireUser(req));
  res.status(204).end();
}

export async function close(req: Request, res: Response) {
  res.json(await pollsService.closePoll(parseId(req), requireUser(req)));
}

export async function vote(req: Request, res: Response) {
  const id = parseId(req);
  const input = voteSchema.parse(req.body ?? {});
  res.status(201).json(await votesService.vote(id, input, requireUser(req)));
}

export async function results(req: Request, res: Response) {
  res.json(await votesService.getResults(parseId(req), requireUser(req)));
}
