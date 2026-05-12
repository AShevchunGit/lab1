import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { WebSocketServer } from 'ws';
import { requireAuth } from '../middleware/auth';
import { checkAndFireAlerts } from '../websocket/alerts';

interface UserRow { id: number }
interface TransactionRow {
  id: number; user_id: number; category_id: number | null;
  title: string; amount: number; type: 'expense' | 'income'; date: string; notes: string | null;
}

export function createTransactionsRouter(db: Database.Database, getWss: () => WebSocketServer | null): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: Request, res: Response) => {
    const { search, category_id, date_from, date_to, amount_min, amount_max, type } =
      req.query as Record<string, string | undefined>;

    let sql = `
      SELECT t.id, t.title, t.amount, t.type, t.date, t.notes, t.created_at,
             t.category_id, c.name AS category_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ?
    `;
    const params: (string | number)[] = [(req.user as UserRow).id];

    if (search) { sql += ' AND (t.title LIKE ? OR t.notes LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (category_id) { sql += ' AND t.category_id = ?'; params.push(Number(category_id)); }
    if (date_from) { sql += ' AND t.date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND t.date <= ?'; params.push(date_to); }
    if (amount_min) { sql += ' AND t.amount >= ?'; params.push(Number(amount_min)); }
    if (amount_max) { sql += ' AND t.amount <= ?'; params.push(Number(amount_max)); }
    if (type === 'expense' || type === 'income') { sql += ' AND t.type = ?'; params.push(type); }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  });

  router.post('/', (req: Request, res: Response) => {
    const { title, amount, date, notes, category_id, type } = req.body as Record<string, string | number | undefined>;
    if (!title || !String(title).trim()) return void res.status(400).json({ error: 'Title is required' });
    if (!amount || Number(amount) <= 0) return void res.status(400).json({ error: 'Amount must be greater than 0' });
    if (!date) return void res.status(400).json({ error: 'Date is required' });
    const txType = type === 'income' ? 'income' : 'expense';

    const row = db.prepare(`
      INSERT INTO transactions (user_id, category_id, title, amount, type, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
    `).get((req.user as UserRow).id, category_id ?? null, String(title).trim(), Number(amount), txType, date, notes ?? null) as TransactionRow;

    if (txType === 'expense') {
      const d = new Date(String(date));
      checkAndFireAlerts(db, getWss(), (req.user as UserRow).id, d.getFullYear(), d.getMonth() + 1);
    }
    res.status(201).json(row);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as TransactionRow | undefined;
    if (!tx) return void res.status(404).json({ error: 'Not found' });
    if (tx.user_id !== (req.user as UserRow).id) return void res.status(403).json({ error: 'Forbidden' });

    const { title, amount, date, notes, category_id, type } = req.body as Record<string, string | number | undefined>;
    if (title !== undefined && !String(title).trim()) return void res.status(400).json({ error: 'Title is required' });
    if (amount !== undefined && Number(amount) <= 0) return void res.status(400).json({ error: 'Amount must be greater than 0' });
    if (type !== undefined && type !== 'expense' && type !== 'income') return void res.status(400).json({ error: 'Type must be expense or income' });

    const updated = db.prepare(`
      UPDATE transactions
      SET title = COALESCE(?, title), amount = COALESCE(?, amount), type = COALESCE(?, type),
          date = COALESCE(?, date), notes = COALESCE(?, notes), category_id = COALESCE(?, category_id)
      WHERE id = ? RETURNING *
    `).get(
      title ? String(title).trim() : null,
      amount ? Number(amount) : null,
      type ?? null,
      date ?? null,
      notes !== undefined ? notes : null,
      category_id !== undefined ? category_id : null,
      tx.id
    ) as TransactionRow;

    const d = new Date(updated.date);
    checkAndFireAlerts(db, getWss(), (req.user as UserRow).id, d.getFullYear(), d.getMonth() + 1);
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as TransactionRow | undefined;
    if (!tx) return void res.status(404).json({ error: 'Not found' });
    if (tx.user_id !== (req.user as UserRow).id) return void res.status(403).json({ error: 'Forbidden' });

    db.prepare('DELETE FROM transactions WHERE id = ?').run(tx.id);
    const d = new Date(tx.date);
    checkAndFireAlerts(db, getWss(), (req.user as UserRow).id, d.getFullYear(), d.getMonth() + 1);
    res.json({ ok: true });
  });

  return router;
}
