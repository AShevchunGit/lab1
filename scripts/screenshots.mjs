import puppeteer from 'puppeteer';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const OUT = path.join(ROOT, 'docs/screenshots');

const BE = 'http://localhost:3001';
const FE = 'http://localhost:5173';

fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForServer(url, timeout = 45000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { await fetch(url); return; } catch {}
    await sleep(500);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log('Running migrations...');
  execSync('npm run migrate', { cwd: BACKEND, stdio: 'inherit' });
  console.log('Seeding database...');
  execSync('npm run seed', { cwd: BACKEND, stdio: 'inherit',
    env: { ...process.env, LOCAL_AUTH_ENABLED: 'true', LOCAL_USERS: 'admin:password' } });

  console.log('Starting servers...');
  const be = spawn('npm', ['run', 'dev'], {
    cwd: BACKEND,
    stdio: 'pipe',
    env: {
      ...process.env,
      LOCAL_AUTH_ENABLED: 'true',
      LOCAL_USERS: 'admin:password',
      FRONTEND_URL: FE,
    },
  });
  const fe = spawn('npm', ['run', 'dev'], { cwd: FRONTEND, stdio: 'pipe' });

  const cleanup = () => { be.kill(); fe.kill(); };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });

  try {
    await waitForServer(`${BE}/auth/local/enabled`);
    await waitForServer(FE);
    await sleep(1500); // let React fully hydrate

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Login page — wait for local-auth form (rendered after /auth/local/enabled API call)
    await page.goto(`${FE}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(3000); // wait for React to mount and /auth/local/enabled to resolve
    await page.waitForSelector('input[placeholder="Username"]', { timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, 'login.png') });
    console.log('✓ login.png');

    // Log in with local credentials
    await page.type('input[placeholder="Username"]', 'admin');
    await page.type('input[placeholder="Password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });

    // Dashboard
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'dashboard.png') });
    console.log('✓ dashboard.png');

    // Transactions
    await page.goto(`${FE}/transactions`, { waitUntil: 'domcontentloaded' });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'transactions.png') });
    console.log('✓ transactions.png');

    // Categories
    await page.goto(`${FE}/categories`, { waitUntil: 'domcontentloaded' });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, 'categories.png') });
    console.log('✓ categories.png');

    await browser.close();
    console.log(`\nScreenshots saved to docs/screenshots/`);
  } finally {
    cleanup();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
