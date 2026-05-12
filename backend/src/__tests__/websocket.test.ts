import http from 'http';
import { WebSocket } from 'ws';
import express from 'express';
import Database from 'better-sqlite3';
import { createDb } from '../db/connection';
import { initSchema } from '../db/schema';
import { initWebSocket } from '../websocket/server';
import { seedUser } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

const NOW = new Date();
const YEAR = NOW.getFullYear();
const MONTH = NOW.getMonth() + 1;
const PAD = String(MONTH).padStart(2, '0');
const DATE = `${YEAR}-${PAD}-01`;

function makeServer(db: Database.Database, userId: number) {
  const app = express();
  const server = http.createServer(app);
  const wss = initWebSocket(server, (req: any, _res: any, next: () => void) => {
    req.session = { passport: { user: userId } };
    next();
  }, db);
  return { server, wss };
}

describe('WebSocket alerts', () => {
  let db: Database.Database;
  let user: { id: number };

  beforeEach(() => {
    db = createDb(':memory:');
    initSchema(db);
    user = seedUser(db);
  });

  function startServer() {
    return new Promise<{ server: http.Server; port: number }>((resolve) => {
      const { server } = makeServer(db, user.id);
      server.listen(0, () => resolve({ server, port: (server.address() as { port: number }).port }));
    });
  }

  function connectWs(port: number) {
    return new Promise<{ ws: WebSocket; msgs: any[] }>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      const msgs: any[] = [];
      ws.on('message', (data) => msgs.push(JSON.parse(data.toString())));
      ws.on('open', () => resolve({ ws, msgs }));
      ws.on('error', reject);
    });
  }

  function waitForMessages(msgs: any[], count: number, timeout = 2000) {
    return new Promise<any[]>((resolve) => {
      const timer = setTimeout(() => resolve(msgs), timeout);
      const id = setInterval(() => {
        if (msgs.length >= count) { clearInterval(id); clearTimeout(timer); resolve(msgs); }
      }, 50);
    });
  }

  test('fires 50% alert on subscribe', async () => {
    db.prepare(`INSERT INTO monthly_budgets (user_id, year, month, budget) VALUES (?, ?, ?, 100)`).run(user.id, YEAR, MONTH);
    db.prepare(`INSERT INTO transactions (user_id, title, amount, date) VALUES (?, 'A', 60, ?)`).run(user.id, DATE);

    const { server, port } = await startServer();
    const { ws, msgs } = await connectWs(port);
    try {
      ws.send(JSON.stringify({ type: 'subscribe' }));
      const received = await waitForMessages(msgs, 1);
      expect(received.length).toBeGreaterThanOrEqual(1);
      expect(received[0].type).toBe('alert');
      expect(received[0].threshold).toBe(50);
    } finally {
      ws.close();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }, 10000);

  test('fires 80% and 100% alerts', async () => {
    db.prepare(`INSERT INTO monthly_budgets (user_id, year, month, budget) VALUES (?, ?, ?, 100)`).run(user.id, YEAR, MONTH);
    db.prepare(`INSERT INTO transactions (user_id, title, amount, date) VALUES (?, 'A', 105, ?)`).run(user.id, DATE);

    const { server, port } = await startServer();
    const { ws, msgs } = await connectWs(port);
    try {
      ws.send(JSON.stringify({ type: 'subscribe' }));
      const received = await waitForMessages(msgs, 3);
      const thresholds = received.map((m: any) => m.threshold).sort((a: number, b: number) => a - b);
      expect(thresholds).toEqual([50, 80, 100]);
    } finally {
      ws.close();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }, 10000);

  test('does not fire same threshold twice', async () => {
    db.prepare(`INSERT INTO monthly_budgets (user_id, year, month, budget) VALUES (?, ?, ?, 100)`).run(user.id, YEAR, MONTH);
    db.prepare(`INSERT INTO transactions (user_id, title, amount, date) VALUES (?, 'A', 60, ?)`).run(user.id, DATE);
    db.prepare(`INSERT INTO budget_alerts (user_id, year, month, threshold) VALUES (?, ?, ?, 50)`).run(user.id, YEAR, MONTH);

    const { server, port } = await startServer();
    const { ws, msgs } = await connectWs(port);
    try {
      ws.send(JSON.stringify({ type: 'subscribe' }));
      const received = await waitForMessages(msgs, 1, 600);
      expect(received.length).toBe(0);
    } finally {
      ws.close();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }, 10000);
});
