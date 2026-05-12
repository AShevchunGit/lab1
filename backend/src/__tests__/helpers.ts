import express, { Express } from 'express';
import Database from 'better-sqlite3';
import { createDb } from '../db/connection';
import { initSchema } from '../db/schema';
import { createCategoriesRouter } from '../routes/categories';
import { createTransactionsRouter } from '../routes/transactions';
import { createBudgetRouter } from '../routes/budget';
import { createAuthRouter } from '../routes/auth';
import { errorHandler } from '../middleware/error';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface UserRow { id: number; provider: string; provider_id: string; email: string; name: string }

export function seedUser(db: Database.Database, provider = 'google', provider_id = 'u1'): UserRow {
  return db.prepare(
    "INSERT INTO users (provider, provider_id, email, name) VALUES (?, ?, 'test@example.com', 'Test User') RETURNING *"
  ).get(provider, provider_id) as UserRow;
}

export function makeAuthApp(user: UserRow, db: Database.Database): Express {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
  app.use('/api/categories', createCategoriesRouter(db));
  app.use('/api/transactions', createTransactionsRouter(db, () => null));
  app.use('/api/budget', createBudgetRouter(db));
  app.use(errorHandler);
  return app;
}

export function createTestApp(userId?: number): { app: Express; db: Database.Database } {
  const db = createDb(':memory:');
  initSchema(db);

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (userId) {
      req.user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
      req.isAuthenticated = () => true;
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });

  app.use('/auth', createAuthRouter(db));
  app.use('/api/categories', createCategoriesRouter(db));
  app.use('/api/transactions', createTransactionsRouter(db, () => null));
  app.use('/api/budget', createBudgetRouter(db));
  app.use(errorHandler);

  return { app, db };
}
