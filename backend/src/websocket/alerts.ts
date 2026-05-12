import Database from 'better-sqlite3';
import { WebSocketServer, WebSocket } from 'ws';

interface AlertClient extends WebSocket {
  userId?: number;
}

export function checkAndFireAlerts(
  db: Database.Database,
  wss: WebSocketServer | null,
  userId: number,
  year: number,
  month: number
): void {
  const budgetRow = db.prepare(
    'SELECT budget FROM monthly_budgets WHERE user_id = ? AND year = ? AND month = ?'
  ).get(userId, year, month) as { budget: number } | undefined;

  if (!budgetRow) return;

  const { total: spent } = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE user_id = ? AND type = 'expense' AND strftime('%Y', date) = ? AND strftime('%m', date) = ?`
  ).get(userId, String(year), String(month).padStart(2, '0')) as { total: number };

  const usagePct = (spent / budgetRow.budget) * 100;

  const insert = db.prepare(
    'INSERT OR IGNORE INTO budget_alerts (user_id, year, month, threshold) VALUES (?, ?, ?, ?)'
  );

  for (const threshold of [50, 80, 100]) {
    if (usagePct >= threshold) {
      const result = insert.run(userId, year, month, threshold);
      if (result.changes > 0) {
        broadcastToUser(wss, userId, {
          type: 'alert',
          threshold,
          usagePct: Math.round(usagePct * 10) / 10,
          spent,
          budget: budgetRow.budget,
        });
      }
    }
  }
}

function broadcastToUser(wss: WebSocketServer | null, userId: number, data: object): void {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    const c = client as AlertClient;
    if (c.readyState === WebSocket.OPEN && c.userId === userId) {
      c.send(message);
    }
  });
}
