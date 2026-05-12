import Database from 'better-sqlite3';

export const name = '002_transaction_type';

export function up(db: Database.Database): void {
  db.exec(`
    ALTER TABLE transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'
      CHECK(type IN ('expense', 'income'));
  `);
}

export function down(db: Database.Database): void {
  // SQLite doesn't support DROP COLUMN before 3.35 — recreate the table
  db.exec(`
    CREATE TABLE transactions_backup AS SELECT * FROM transactions;
    DROP TABLE transactions;
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO transactions SELECT id, user_id, category_id, title, amount, date, notes, created_at FROM transactions_backup;
    DROP TABLE transactions_backup;
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  `);
}
