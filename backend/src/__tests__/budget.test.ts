import request from 'supertest';
import express, { Express } from 'express';
import Database from 'better-sqlite3';
import { createDb } from '../db/connection';
import { initSchema } from '../db/schema';
import { createBudgetRouter } from '../routes/budget';
import { errorHandler } from '../middleware/error';
import { seedUser, UserRow } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeApp(db: Database.Database, user: UserRow): Express {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
  app.use('/api/budget', createBudgetRouter(db));
  app.use(errorHandler);
  return app;
}

describe('Budget', () => {
  let db: Database.Database;
  let user: UserRow;
  let app: Express;

  beforeEach(() => {
    db = createDb(':memory:');
    initSchema(db);
    user = seedUser(db);
    app = makeApp(db, user);
  });

  test('returns null budget when none set', async () => {
    const res = await request(app).get('/api/budget/2024/3');
    expect(res.status).toBe(200);
    expect(res.body.budget).toBeNull();
    expect(res.body.spent).toBe(0);
  });

  test('sets a budget', async () => {
    const res = await request(app).put('/api/budget/2024/3').send({ budget: 500 });
    expect(res.status).toBe(200);
    expect(res.body.budget).toBe(500);
  });

  test('returns correct summary with transactions', async () => {
    await request(app).put('/api/budget/2024/3').send({ budget: 500 });
    db.prepare("INSERT INTO transactions (user_id, title, amount, date) VALUES (?, 'A', 100, '2024-03-10')").run(user.id);
    db.prepare("INSERT INTO transactions (user_id, title, amount, date) VALUES (?, 'B', 150, '2024-03-20')").run(user.id);
    const res = await request(app).get('/api/budget/2024/3');
    expect(res.status).toBe(200);
    expect(res.body.spent).toBe(250);
    expect(res.body.remaining).toBe(250);
    expect(res.body.usagePct).toBe(50);
  });

  test('returns 400 for non-positive budget', async () => {
    const res = await request(app).put('/api/budget/2024/3').send({ budget: 0 });
    expect(res.status).toBe(400);
  });

  test('updates existing budget', async () => {
    await request(app).put('/api/budget/2024/3').send({ budget: 500 });
    await request(app).put('/api/budget/2024/3').send({ budget: 1000 });
    const summary = await request(app).get('/api/budget/2024/3');
    expect(summary.body.budget).toBe(1000);
  });
});
