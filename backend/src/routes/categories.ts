import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { requireAuth } from '../middleware/auth';

interface UserRow { id: number }

export function createCategoriesRouter(db: Database.Database): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: Request, res: Response) => {
    const rows = db.prepare(
      'SELECT id, name, created_at FROM categories WHERE user_id = ? ORDER BY name'
    ).all((req.user as UserRow).id);
    res.json(rows);
  });

  router.post('/', (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) return void res.status(400).json({ error: 'Name is required' });
    try {
      const row = db.prepare(
        'INSERT INTO categories (user_id, name) VALUES (?, ?) RETURNING id, name, created_at'
      ).get((req.user as UserRow).id, name.trim());
      res.status(201).json(row);
    } catch (err) {
      if ((err as Error).message.includes('UNIQUE')) {
        return void res.status(409).json({ error: 'Category name already exists' });
      }
      throw err;
    }
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const cat = db.prepare(
      'SELECT id, user_id FROM categories WHERE id = ?'
    ).get(req.params.id) as { id: number; user_id: number } | undefined;
    if (!cat) return void res.status(404).json({ error: 'Not found' });
    if (cat.user_id !== (req.user as UserRow).id) return void res.status(403).json({ error: 'Forbidden' });

    const { name } = req.body as { name?: string };
    if (!name?.trim()) return void res.status(400).json({ error: 'Name is required' });

    try {
      const row = db.prepare(
        'UPDATE categories SET name = ? WHERE id = ? RETURNING id, name, created_at'
      ).get(name.trim(), cat.id);
      res.json(row);
    } catch (err) {
      if ((err as Error).message.includes('UNIQUE')) {
        return void res.status(409).json({ error: 'Category name already exists' });
      }
      throw err;
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const cat = db.prepare(
      'SELECT id, user_id FROM categories WHERE id = ?'
    ).get(req.params.id) as { id: number; user_id: number } | undefined;
    if (!cat) return void res.status(404).json({ error: 'Not found' });
    if (cat.user_id !== (req.user as UserRow).id) return void res.status(403).json({ error: 'Forbidden' });

    const { cnt } = db.prepare(
      'SELECT COUNT(*) AS cnt FROM transactions WHERE category_id = ?'
    ).get(cat.id) as { cnt: number };
    if (cnt > 0) return void res.status(409).json({ error: 'Cannot delete: category has transactions' });

    db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
    res.json({ ok: true });
  });

  return router;
}
