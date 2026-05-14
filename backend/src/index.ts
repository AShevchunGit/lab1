import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';
import { WebSocketServer } from 'ws';

import type Database from 'better-sqlite3';
import { createDb } from './db/connection';
import { initSchema } from './db/schema';
import { migrateUp } from './db/migrate';
import { createAuthRouter } from './routes/auth';
import { createCategoriesRouter } from './routes/categories';
import { createTransactionsRouter } from './routes/transactions';
import { createBudgetRouter } from './routes/budget';
import { initWebSocket } from './websocket/server';
import { errorHandler } from './middleware/error';

const db: Database.Database = createDb();
initSchema(db);
migrateUp(db);

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

let wss: WebSocketServer | null = null;
const getWss = () => wss;

app.use('/auth', createAuthRouter(db));
app.use('/api/categories', createCategoriesRouter(db));
app.use('/api/transactions', createTransactionsRouter(db, getWss));
app.use('/api/budget', createBudgetRouter(db));
app.use(errorHandler);

const server = http.createServer(app);
wss = initWebSocket(server, sessionMiddleware, db);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));

export { app, db };
