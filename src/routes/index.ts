import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import * as auth from '../controllers/auth.controller';
import * as polls from '../controllers/polls.controller';
import * as system from '../controllers/system.controller';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

export const apiRouter = Router();

// מערכת
apiRouter.get('/health', system.health);
apiRouter.get('/categories', system.categories);

// התחברות
const authRouter = Router();
authRouter.post('/register', authRateLimit, auth.register);
authRouter.post('/login', authRateLimit, auth.login);
authRouter.get('/me', authenticate, auth.me);
apiRouter.use('/auth', authRouter);

// סקרים
const pollsRouter = Router();
pollsRouter.get('/', optionalAuth, polls.list);
pollsRouter.get('/:id', optionalAuth, polls.getById);
pollsRouter.post('/', authenticate, polls.create);
pollsRouter.put('/:id', authenticate, polls.update);
pollsRouter.delete('/:id', authenticate, polls.remove);
pollsRouter.post('/:id/close', authenticate, polls.close);
pollsRouter.post('/:id/votes', authenticate, polls.vote);
pollsRouter.get('/:id/results', authenticate, polls.results);
apiRouter.use('/polls', pollsRouter);

// ניהול - מנהל בלבד
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('ADMIN'));
adminRouter.get('/polls', admin.listPolls);
adminRouter.post('/polls/:id/approve', admin.approve);
adminRouter.post('/polls/:id/reject', admin.reject);
adminRouter.patch('/polls/:id/visibility', admin.visibility);
apiRouter.use('/admin', adminRouter);
