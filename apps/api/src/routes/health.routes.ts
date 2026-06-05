import { Router } from 'express';
import { db } from '../db/connection.js';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  let dbStatus: 'up' | 'down' = 'down';
  try {
    db.prepare('SELECT 1 AS ok').get();
    dbStatus = 'up';
  } catch {
    dbStatus = 'down';
  }

  const ok = dbStatus === 'up';
  res.status(ok ? 200 : 503).json({ ok, db: dbStatus });
});
