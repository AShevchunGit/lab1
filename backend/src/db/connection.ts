import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let instance: Database.Database | null = null;

export function createDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath || process.env.DB_PATH || './data/expense_tracker.db';
  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function getDb(): Database.Database {
  if (!instance) instance = createDb();
  return instance;
}
