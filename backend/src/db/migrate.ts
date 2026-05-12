import { createDb } from './connection';

interface Migration {
  name: string;
  up: (db: import('better-sqlite3').Database) => void;
  down: (db: import('better-sqlite3').Database) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migrations: Migration[] = [
  require('./migrations/001_initial'),
  require('./migrations/002_transaction_type'),
];

function ensureMigrationsTable(db: import('better-sqlite3').Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getApplied(db: import('better-sqlite3').Database): Set<string> {
  const rows = db.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function migrateUp(db: import('better-sqlite3').Database): void {
  ensureMigrationsTable(db);
  const applied = getApplied(db);
  let count = 0;
  for (const m of migrations) {
    if (!applied.has(m.name)) {
      console.log(`Applying migration: ${m.name}`);
      m.up(db);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(m.name);
      count++;
    }
  }
  console.log(count ? `Applied ${count} migration(s).` : 'Nothing to migrate.');
}

function migrateDown(db: import('better-sqlite3').Database): void {
  ensureMigrationsTable(db);
  const applied = getApplied(db);
  const toRevert = [...migrations].reverse().find((m) => applied.has(m.name));
  if (!toRevert) {
    console.log('Nothing to revert.');
    return;
  }
  console.log(`Reverting migration: ${toRevert.name}`);
  toRevert.down(db);
  db.prepare('DELETE FROM _migrations WHERE name = ?').run(toRevert.name);
  console.log('Done.');
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
  const db = createDb();
  const cmd = process.argv[2];
  if (cmd === 'down') migrateDown(db);
  else migrateUp(db);
}

export { migrateUp, migrateDown };
