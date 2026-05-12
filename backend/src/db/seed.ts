import 'dotenv/config';
import { createDb } from './connection';
import { initSchema } from './schema';

const db = createDb();
initSchema(db);

const pad = (n: number) => String(n).padStart(2, '0');
const demoYear = new Date().getFullYear();

// ── Users ────────────────────────────────────────────────────────────────────

function upsertNamedUser(provider: string, providerId: string, email: string, name: string): number {
  const existing = db.prepare(
    'SELECT id FROM users WHERE provider = ? AND provider_id = ?'
  ).get(provider, providerId) as { id: number } | undefined;
  if (existing) return existing.id;
  const row = db.prepare(
    'INSERT INTO users (provider, provider_id, email, name) VALUES (?, ?, ?, ?) RETURNING id'
  ).get(provider, providerId, email, name) as { id: number };
  return row.id;
}

const demoUserId = upsertNamedUser('demo', '1', 'demo@example.com', 'Demo User');
const adminUserId = upsertNamedUser('local', 'admin', 'admin@local', 'admin');
console.log(`Demo user id=${demoUserId}, admin user id=${adminUserId}`);

// ── Categories ────────────────────────────────────────────────────────────────

const categoryNames = [
  'Food & Dining', 'Transport', 'Housing', 'Entertainment',
  'Health', 'Shopping', 'Utilities', 'Education',
  'Travel', 'Personal Care', 'Subscriptions', 'Fitness',
];

function seedCategories(userId: number): Record<string, number> {
  const ids: Record<string, number> = {};
  for (const name of categoryNames) {
    try {
      const cat = db.prepare(
        'INSERT INTO categories (user_id, name) VALUES (?, ?) RETURNING id, name'
      ).get(userId, name) as { id: number; name: string };
      ids[name] = cat.id;
    } catch {
      const cat = db.prepare(
        'SELECT id, name FROM categories WHERE user_id = ? AND name = ?'
      ).get(userId, name) as { id: number; name: string };
      ids[name] = cat.id;
    }
  }
  return ids;
}

const demoCategoryIds = seedCategories(demoUserId);
const adminCategoryIds = seedCategories(adminUserId);
console.log('Categories seeded for both users.');

// ── Transaction data ──────────────────────────────────────────────────────────

type TxDef = { title: string; amount: number; day: number; category: string; notes?: string; type?: 'expense' | 'income' };

// Monthly budgets — higher in holiday/summer months
const monthlyBudgets: Record<number, number> = {
  1: 3200, 2: 3000, 3: 3300, 4: 3600,
  5: 3300, 6: 4200, 7: 4500, 8: 3800,
  9: 3300, 10: 3500, 11: 4000, 12: 5000,
};

function incomeTransactions(m: number): TxDef[] {
  const bonusMonths: Record<number, number> = { 6: 800, 12: 1500 };
  const freelanceMonths: Record<number, number> = { 2: 350, 4: 480, 7: 620, 9: 290, 11: 510 };
  const txs: TxDef[] = [
    { title: 'Salary', amount: 4800.00, day: 28, category: 'Food & Dining', notes: 'Monthly salary', type: 'income' },
  ];
  if (bonusMonths[m]) txs.push({ title: 'Performance bonus', amount: bonusMonths[m], day: 15, category: 'Food & Dining', notes: 'Quarterly bonus', type: 'income' });
  if (freelanceMonths[m]) txs.push({ title: 'Freelance project', amount: freelanceMonths[m], day: 20, category: 'Education', notes: 'Consulting work', type: 'income' });
  if (m % 3 === 0) txs.push({ title: 'Investment dividends', amount: 120 + (m % 4) * 30, day: 10, category: 'Shopping', notes: 'Portfolio dividends', type: 'income' });
  if (m === 4 || m === 10) txs.push({ title: 'Tax refund', amount: 340.00, day: 18, category: 'Housing', notes: 'Annual tax refund', type: 'income' });
  return txs;
}

function baseTransactions(m: number): TxDef[] {
  return [
    // Fixed monthly
    { title: 'Rent',              amount: 1200.00, day: 1,  category: 'Housing',       notes: 'Monthly rent' },
    { title: 'Electricity & Gas', amount: m <= 2 || m === 12 ? 162 : m >= 6 && m <= 8 ? 148 : 122,
                                                   day: 3,  category: 'Utilities',     notes: 'Utility bill' },
    { title: 'Internet',          amount: 59.99,   day: 5,  category: 'Utilities' },
    { title: 'Netflix',           amount: 15.99,   day: 5,  category: 'Subscriptions' },
    { title: 'Spotify',           amount: 9.99,    day: 5,  category: 'Subscriptions' },
    { title: 'Gym membership',    amount: 40.00,   day: 2,  category: 'Fitness' },
    { title: 'Monthly bus pass',  amount: 45.00,   day: 1,  category: 'Transport' },

    // Recurring food & dining
    { title: 'Groceries',         amount: 87 + (m % 4) * 11, day: 5,  category: 'Food & Dining', notes: 'Weekly shop' },
    { title: 'Groceries',         amount: 79 + (m % 3) * 9,  day: 12, category: 'Food & Dining', notes: 'Weekly shop' },
    { title: 'Groceries',         amount: 94 + (m % 5) * 7,  day: 19, category: 'Food & Dining', notes: 'Weekly shop' },
    { title: 'Groceries',         amount: 82 + (m % 4) * 8,  day: 26, category: 'Food & Dining', notes: 'Weekly shop' },
    { title: 'Restaurant',        amount: 64 + (m % 4) * 12, day: 8,  category: 'Food & Dining', notes: 'Dinner out' },
    { title: 'Lunch',             amount: 16 + (m % 3) * 4,  day: 11, category: 'Food & Dining', notes: 'Work lunch' },
    { title: 'Coffee shop',       amount: 11.50,              day: 16, category: 'Food & Dining' },
    { title: 'Takeaway',          amount: 28 + (m % 3) * 6,  day: 23, category: 'Food & Dining' },

    // Fuel varies slightly
    { title: 'Fuel',              amount: 55 + (m % 3) * 9,  day: 14, category: 'Transport' },
  ];
}

function monthSpecificTransactions(m: number): TxDef[] {
  const byMonth: Record<number, TxDef[]> = {
    1: [
      { title: 'New Year gym kit',       amount: 89.99,  day: 4,  category: 'Fitness',       notes: 'New year resolutions' },
      { title: 'Winter jacket',          amount: 149.00, day: 10, category: 'Shopping' },
      { title: 'Pharmacy',               amount: 28.50,  day: 18, category: 'Health',         notes: 'Cold medicine' },
      { title: 'Online course',          amount: 49.99,  day: 22, category: 'Education',      notes: 'Udemy annual subscription' },
      { title: 'Home insurance renewal', amount: 320.00, day: 28, category: 'Housing',        notes: 'Annual premium' },
    ],
    2: [
      { title: "Valentine's dinner",     amount: 115.00, day: 14, category: 'Food & Dining',  notes: 'Special occasion' },
      { title: 'Flowers',                amount: 45.00,  day: 14, category: 'Shopping' },
      { title: 'Dentist check-up',       amount: 120.00, day: 10, category: 'Health' },
      { title: 'Haircut',                amount: 35.00,  day: 20, category: 'Personal Care' },
      { title: 'Cinema x2',              amount: 28.00,  day: 21, category: 'Entertainment' },
    ],
    3: [
      { title: 'Spring wardrobe',        amount: 187.50, day: 15, category: 'Shopping',       notes: 'New season' },
      { title: 'Doctor visit',           amount: 65.00,  day: 8,  category: 'Health' },
      { title: 'Books',                  amount: 42.00,  day: 20, category: 'Education' },
      { title: 'Cinema x2',             amount: 28.00,  day: 22, category: 'Entertainment' },
      { title: 'Car wash',               amount: 18.00,  day: 28, category: 'Transport' },
    ],
    4: [
      { title: 'Easter trip (train)',    amount: 95.00,  day: 1,  category: 'Travel',         notes: 'Return tickets' },
      { title: 'Easter hotel',           amount: 210.00, day: 2,  category: 'Travel',         notes: '2 nights' },
      { title: 'Amazon Prime',           amount: 8.99,   day: 10, category: 'Subscriptions' },
      { title: 'Running shoes',          amount: 129.99, day: 18, category: 'Fitness' },
      { title: 'Allergy medication',     amount: 22.00,  day: 25, category: 'Health' },
    ],
    5: [
      { title: 'Concert tickets',        amount: 78.00,  day: 5,  category: 'Entertainment' },
      { title: 'Weekend fuel',           amount: 48.00,  day: 11, category: 'Transport',      notes: 'Road trip' },
      { title: 'Sunglasses',             amount: 65.00,  day: 17, category: 'Shopping' },
      { title: 'Vitamin supplements',    amount: 38.00,  day: 22, category: 'Health' },
      { title: 'Haircut',                amount: 35.00,  day: 26, category: 'Personal Care' },
    ],
    6: [
      { title: 'Summer flights',         amount: 320.00, day: 2,  category: 'Travel',         notes: 'Return flights' },
      { title: 'Holiday hotel',          amount: 560.00, day: 3,  category: 'Travel',         notes: '4 nights' },
      { title: 'Holiday dining',         amount: 145.00, day: 9,  category: 'Food & Dining',  notes: 'Holiday meals' },
      { title: 'Beach gear',             amount: 85.00,  day: 5,  category: 'Shopping' },
      { title: 'Travel insurance',       amount: 42.00,  day: 1,  category: 'Travel' },
      { title: 'Sunscreen & toiletries', amount: 34.50,  day: 5,  category: 'Personal Care' },
    ],
    7: [
      { title: 'BBQ & garden party',     amount: 112.00, day: 4,  category: 'Food & Dining',  notes: 'Garden party' },
      { title: 'Aircon servicing',       amount: 95.00,  day: 12, category: 'Housing',        notes: 'Annual service' },
      { title: 'Outdoor furniture',      amount: 245.00, day: 16, category: 'Shopping' },
      { title: 'Music festival',         amount: 180.00, day: 20, category: 'Entertainment',  notes: 'Weekend pass' },
      { title: 'Physiotherapy',          amount: 70.00,  day: 25, category: 'Health' },
      { title: 'Ice cream & snacks',     amount: 24.00,  day: 10, category: 'Food & Dining' },
    ],
    8: [
      { title: 'City break flights',     amount: 195.00, day: 5,  category: 'Travel' },
      { title: 'City break hotel',       amount: 280.00, day: 6,  category: 'Travel',         notes: '2 nights' },
      { title: 'Back-to-school supplies',amount: 76.50,  day: 18, category: 'Education' },
      { title: 'Laptop bag',             amount: 58.00,  day: 14, category: 'Shopping' },
      { title: 'Haircut & styling',      amount: 55.00,  day: 22, category: 'Personal Care' },
      { title: 'Protein powder',         amount: 42.00,  day: 8,  category: 'Fitness' },
    ],
    9: [
      { title: 'Online course',          amount: 79.99,  day: 3,  category: 'Education',      notes: 'Advanced React' },
      { title: 'Autumn wardrobe',        amount: 163.00, day: 14, category: 'Shopping' },
      { title: 'Annual eye test',        amount: 45.00,  day: 18, category: 'Health' },
      { title: 'Theatre tickets x2',     amount: 62.00,  day: 25, category: 'Entertainment' },
      { title: 'Boiler service',         amount: 110.00, day: 28, category: 'Housing',        notes: 'Annual check' },
    ],
    10: [
      { title: 'Halloween costumes',     amount: 52.00,  day: 25, category: 'Shopping' },
      { title: 'Annual car service',     amount: 185.00, day: 8,  category: 'Transport' },
      { title: 'Flu vaccination',        amount: 15.00,  day: 10, category: 'Health' },
      { title: 'New book series',        amount: 38.00,  day: 18, category: 'Entertainment' },
      { title: 'Plumber call-out',       amount: 95.00,  day: 22, category: 'Housing' },
      { title: 'Umbrella & rain gear',   amount: 29.00,  day: 5,  category: 'Shopping' },
    ],
    11: [
      { title: 'Black Friday haul',      amount: 312.00, day: 24, category: 'Shopping',       notes: 'Black Friday deals' },
      { title: 'Winter coat',            amount: 175.00, day: 10, category: 'Shopping' },
      { title: 'Streaming bundle',       amount: 19.99,  day: 5,  category: 'Subscriptions' },
      { title: 'Cold & flu medicine',    amount: 24.50,  day: 15, category: 'Health' },
      { title: 'Cloud storage',          amount: 9.99,   day: 5,  category: 'Subscriptions' },
      { title: 'Advent calendar',        amount: 35.00,  day: 30, category: 'Shopping' },
    ],
    12: [
      { title: 'Christmas gifts',        amount: 420.00, day: 10, category: 'Shopping',       notes: 'Family gifts' },
      { title: 'Christmas groceries',    amount: 145.00, day: 22, category: 'Food & Dining',  notes: 'Christmas dinner' },
      { title: 'New Year party',         amount: 85.00,  day: 30, category: 'Entertainment' },
      { title: 'Holiday flights',        amount: 280.00, day: 5,  category: 'Travel',         notes: 'Visit family' },
      { title: 'Gift wrap & cards',      amount: 28.00,  day: 12, category: 'Shopping' },
      { title: 'Christmas market',       amount: 67.00,  day: 18, category: 'Food & Dining',  notes: 'Food & drinks' },
    ],
  };
  return byMonth[m] ?? [];
}

// ── Insert transactions & budgets ─────────────────────────────────────────────

const insertTx = db.prepare(
  "INSERT INTO transactions (user_id, category_id, title, amount, type, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
const insertBudget = db.prepare(
  'INSERT INTO monthly_budgets (user_id, year, month, budget) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, year, month) DO UPDATE SET budget = excluded.budget'
);

function seedYear(userId: number, categoryIds: Record<string, number>, label: string) {
  db.prepare(
    `DELETE FROM transactions WHERE user_id = ? AND strftime('%Y', date) = ?`
  ).run(userId, String(demoYear));

  let totalTx = 0;
  for (let m = 1; m <= 12; m++) {
    const txs = [...incomeTransactions(m), ...baseTransactions(m), ...monthSpecificTransactions(m)];
    for (const t of txs) {
      const date = `${demoYear}-${pad(m)}-${pad(t.day)}`;
      insertTx.run(userId, categoryIds[t.category] ?? null, t.title, t.amount, t.type ?? 'expense', date, t.notes ?? null);
    }
    insertBudget.run(userId, demoYear, m, monthlyBudgets[m]);
    console.log(`  [${label}] ${demoYear}-${pad(m)}: ${txs.length} transactions, budget $${monthlyBudgets[m]}`);
    totalTx += txs.length;
  }
  console.log(`  [${label}] Total: ${totalTx} transactions across 12 months\n`);
}

seedYear(demoUserId, demoCategoryIds, 'demo');
seedYear(adminUserId, adminCategoryIds, 'admin');

console.log('Seed complete!');
