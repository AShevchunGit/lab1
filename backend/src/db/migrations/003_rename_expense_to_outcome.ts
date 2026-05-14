import Database from 'better-sqlite3';

export const name = '003_rename_expense_to_outcome';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL DEFAULT 'outcome' CHECK(type IN ('outcome', 'income'))
    );
    INSERT INTO transactions_new SELECT id, user_id, category_id, title, amount, date, notes, created_at,
      CASE WHEN type = 'expense' THEN 'outcome' ELSE type END
    FROM transactions;
    DROP TABLE transactions;
    ALTER TABLE transactions_new RENAME TO transactions;
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  `);
}

export function down(db: Database.Database): void {
  db.exec(`
    CREATE TABLE transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('expense', 'income'))
    );
    INSERT INTO transactions_new SELECT id, user_id, category_id, title, amount, date, notes, created_at,
      CASE WHEN type = 'outcome' THEN 'expense' ELSE type END
    FROM transactions;
    DROP TABLE transactions;
    ALTER TABLE transactions_new RENAME TO transactions;
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  `);
}
