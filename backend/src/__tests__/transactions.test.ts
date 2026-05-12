import request from 'supertest';
import express, { Express } from 'express';
import Database from 'better-sqlite3';
import { createDb } from '../db/connection';
import { initSchema } from '../db/schema';
import { createTransactionsRouter } from '../routes/transactions';
import { errorHandler } from '../middleware/error';
import { seedUser, UserRow } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeApp(userId: number, db: Database.Database): Express {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
  app.use('/api/transactions', createTransactionsRouter(db, () => null));
  app.use(errorHandler);
  return app;
}

describe('Transactions', () => {
  let db: Database.Database;
  let user: UserRow;
  let app: Express;

  beforeEach(() => {
    db = createDb(':memory:');
    initSchema(db);
    user = seedUser(db);
    app = makeApp(user.id, db);
  });

  test('creates a transaction', async () => {
    const res = await request(app).post('/api/transactions').send({ title: 'Coffee', amount: 5.5, date: '2024-03-15' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Coffee');
    expect(res.body.amount).toBe(5.5);
  });

  test('returns 400 for missing title', async () => {
    const res = await request(app).post('/api/transactions').send({ amount: 10, date: '2024-03-01' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for non-positive amount', async () => {
    const res = await request(app).post('/api/transactions').send({ title: 'x', amount: -1, date: '2024-03-01' });
    expect(res.status).toBe(400);
  });

  test('updates a transaction', async () => {
    const create = await request(app).post('/api/transactions').send({ title: 'Lunch', amount: 12, date: '2024-03-10' });
    const res = await request(app).patch(`/api/transactions/${create.body.id}`).send({ amount: 15 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(15);
  });

  test('deletes a transaction', async () => {
    const create = await request(app).post('/api/transactions').send({ title: 'Taxi', amount: 20, date: '2024-03-05' });
    const res = await request(app).delete(`/api/transactions/${create.body.id}`);
    expect(res.status).toBe(200);
  });

  test('filters by search term', async () => {
    await request(app).post('/api/transactions').send({ title: 'Starbucks', amount: 6, date: '2024-03-01' });
    await request(app).post('/api/transactions').send({ title: 'Taxi', amount: 20, date: '2024-03-02' });
    const res = await request(app).get('/api/transactions?search=star');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Starbucks');
  });

  test('filters by date range', async () => {
    await request(app).post('/api/transactions').send({ title: 'A', amount: 10, date: '2024-03-01' });
    await request(app).post('/api/transactions').send({ title: 'B', amount: 10, date: '2024-04-01' });
    const res = await request(app).get('/api/transactions?date_from=2024-03-01&date_to=2024-03-31');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('A');
  });

  test('cross-user access returns 403', async () => {
    const tx = db.prepare("INSERT INTO transactions (user_id, title, amount, date) VALUES (?, 'Secret', 100, '2024-03-01') RETURNING *").get(user.id) as { id: number };
    const attacker = seedUser(db, 'google', 'attacker99');
    const attackerApp = makeApp(attacker.id, db);
    const res = await request(attackerApp).delete(`/api/transactions/${tx.id}`);
    expect(res.status).toBe(403);
  });
});
