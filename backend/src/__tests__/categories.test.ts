import request from 'supertest';
import express from 'express';
import { createDb } from '../db/connection';
import { initSchema } from '../db/schema';
import { createCategoriesRouter } from '../routes/categories';
import { errorHandler } from '../middleware/error';
import { seedUser, UserRow } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeApp(user?: UserRow) {
  const db = createDb(':memory:');
  initSchema(db);
  const seeded = user || seedUser(db);

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = seeded; req.isAuthenticated = () => true; next(); });
  app.use('/api/categories', createCategoriesRouter(db));
  app.use(errorHandler);
  return { app, db, user: seeded };
}

describe('Categories', () => {
  test('creates a category', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/categories').send({ name: 'Food' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Food');
  });

  test('returns 400 for empty name', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/categories').send({ name: '' });
    expect(res.status).toBe(400);
  });

  test('returns 409 for duplicate name', async () => {
    const { app } = makeApp();
    await request(app).post('/api/categories').send({ name: 'Food' });
    const res = await request(app).post('/api/categories').send({ name: 'Food' });
    expect(res.status).toBe(409);
  });

  test('renames a category', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/api/categories').send({ name: 'Food' });
    const res = await request(app).patch(`/api/categories/${create.body.id}`).send({ name: 'Groceries' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Groceries');
  });

  test('deletes a category', async () => {
    const { app } = makeApp();
    const create = await request(app).post('/api/categories').send({ name: 'Food' });
    const res = await request(app).delete(`/api/categories/${create.body.id}`);
    expect(res.status).toBe(200);
  });

  test('blocks deletion when category has transactions', async () => {
    const db = createDb(':memory:');
    initSchema(db);
    const user = seedUser(db);

    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
    app.use('/api/categories', createCategoriesRouter(db));
    app.use(errorHandler);

    const cat = db.prepare("INSERT INTO categories (user_id, name) VALUES (?, 'Bills') RETURNING *").get(user.id) as { id: number };
    db.prepare("INSERT INTO transactions (user_id, category_id, title, amount, date) VALUES (?, ?, 'Electricity', 100, '2024-01-15')").run(user.id, cat.id);

    const res = await request(app).delete(`/api/categories/${cat.id}`);
    expect(res.status).toBe(409);
  });

  test('cross-user access returns 403', async () => {
    const db = createDb(':memory:');
    initSchema(db);
    const owner = seedUser(db, 'google', 'owner1');
    const attacker = seedUser(db, 'google', 'attacker1');
    const cat = db.prepare("INSERT INTO categories (user_id, name) VALUES (?, 'Private') RETURNING *").get(owner.id) as { id: number };

    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.user = attacker; req.isAuthenticated = () => true; next(); });
    app.use('/api/categories', createCategoriesRouter(db));
    app.use(errorHandler);

    const res = await request(app).delete(`/api/categories/${cat.id}`);
    expect(res.status).toBe(403);
  });
});
