import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { requireAuth } from '../middleware/auth';

interface UserRow { id: number }

export function createBudgetRouter(db: Database.Database): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/:year/:month', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const userId = (req.user as UserRow).id;
    const pad = (n: number) => String(n).padStart(2, '0');

    const budgetRow = db.prepare(
      'SELECT budget FROM monthly_budgets WHERE user_id = ? AND year = ? AND month = ?'
    ).get(userId, year, month) as { budget: number } | undefined;

    const { total: spent } = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE user_id = ? AND type = 'expense'
         AND strftime('%Y', date) = ? AND strftime('%m', date) = ?`
    ).get(userId, String(year), pad(month)) as { total: number };

    const { total: income } = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE user_id = ? AND type = 'income'
         AND strftime('%Y', date) = ? AND strftime('%m', date) = ?`
    ).get(userId, String(year), pad(month)) as { total: number };

    const net = income - spent;

    if (!budgetRow) return void res.json({ budget: null, spent, income, net, remaining: null, usagePct: null });

    const budget = budgetRow.budget;
    const remaining = budget - spent;
    const usagePct = Math.round((spent / budget) * 1000) / 10;
    res.json({ budget, spent, income, net, remaining, usagePct });
  });

  router.put('/:year/:month', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const { budget } = req.body as { budget?: number };

    if (!budget || Number(budget) <= 0) return void res.status(400).json({ error: 'Budget must be greater than 0' });

    db.prepare(`
      INSERT INTO monthly_budgets (user_id, year, month, budget) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, year, month) DO UPDATE SET budget = excluded.budget
    `).run((req.user as UserRow).id, year, month, Number(budget));

    res.json({ budget: Number(budget), year, month });
  });

  return router;
}
