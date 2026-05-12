import request from 'supertest';
import express from 'express';
import { createDb } from '../db/connection';
import { initSchema } from '../db/schema';
import { createAuthRouter } from '../routes/auth';
import { errorHandler } from '../middleware/error';
import { seedUser } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Auth routes', () => {
  test('GET /auth/me returns 401 when not authenticated', async () => {
    const db = createDb(':memory:');
    initSchema(db);
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.isAuthenticated = () => false; next(); });
    app.use('/auth', createAuthRouter(db));
    app.use(errorHandler);

    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /auth/me returns user when authenticated', async () => {
    const db = createDb(':memory:');
    initSchema(db);
    const user = seedUser(db);

    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.user = user; req.isAuthenticated = () => true; next(); });
    app.use('/auth', createAuthRouter(db));
    app.use(errorHandler);

    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.email).toBe('test@example.com');
  });
});
