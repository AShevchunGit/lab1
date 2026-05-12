# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All common operations are in the root `Makefile`:

```bash
make deps          # npm install for both backend and frontend
make dev-be        # backend dev server (ts-node, port 3001)
make dev-fe        # frontend dev server (Vite, port 5173)
make build         # tsc + vite build
make lint          # ESLint for both
make test          # backend Jest tests (only backend has tests)
make migrate       # run pending DB migrations
make revert        # revert the last migration
make seed          # seed demo data + local admin user
```

Run a single backend test file:
```bash
cd backend && npx jest src/__tests__/categories.test.ts
```

Frontend typecheck only (no emit):
```bash
cd frontend && npm run typecheck
```

## Architecture

### Backend (`backend/src/`)

Express + TypeScript, SQLite via `better-sqlite3` (synchronous API — no `await` on DB calls).

**Startup flow:** `index.ts` → creates DB singleton (`db/connection.ts`), runs `initSchema` (idempotent `CREATE TABLE IF NOT EXISTS`), mounts routers, then calls `initWebSocket`.

**Router factory pattern:** every route file exports a `create*Router(db)` function that takes the DB instance. `createTransactionsRouter` also takes a `wss` reference (or null in tests) to trigger budget alert checks after mutations.

**Auth:** Passport.js with Google and GitHub strategies (only registered if the corresponding env vars are set). Local hardcoded users are enabled by `LOCAL_AUTH_ENABLED=true`; credentials come from `LOCAL_USERS=user:pass,user2:pass2`. All three providers upsert into the `users` table with a `(provider, provider_id)` unique key.

**DB migrations:** `db/migrate.ts` maintains a `_migrations` table. New migrations go in `db/migrations/` and must be `require()`d into the array in `migrate.ts`. Each migration exports `name`, `up(db)`, `down(db)`.

**WebSocket alerts:** `websocket/server.ts` authenticates the upgrade by running the express-session middleware over the raw `http.IncomingMessage` and reading `req.session?.passport?.user`. Alerts only fire when the client sends `{ "type": "subscribe" }`, not on connection. `websocket/alerts.ts` uses `INSERT OR IGNORE` into `budget_alerts` to deduplicate; it only broadcasts if `db.changes > 0`.

### Frontend (`frontend/src/`)

React 18 + Vite + Styled Components + React Router v6. No state management library — local `useState`/`useEffect` plus a single `AuthContext`.

**Auth state:** `AuthContext` exposes `user: User | null | undefined` — `undefined` means the `/auth/me` check is still in flight. `ProtectedRoute` in `App.tsx` shows a spinner while `undefined`, redirects to `/login` if `null`.

**API client:** `api.ts` exports a typed `api` object. All calls go through the generic `request<T>()` helper which sets `credentials: 'include'` (session cookie) and serializes the body. The base URL comes from `VITE_API_URL` env var, falling back to `http://localhost:3001`.

**Theme:** Styled Components `ThemeProvider` wraps the whole app in `main.tsx`. The theme object is in `theme.ts`; `styled.d.ts` augments `DefaultTheme` so `${({ theme }) => theme.colors.primary}` is fully typed.

**WebSocket:** `hooks/useWebSocket.ts` opens a connection after auth, listens for `{ type: "alert" }` messages, and reconnects with a 3-second delay on close.

### Test setup (`backend/src/__tests__/`)

Tests use in-memory SQLite (`:memory:`) and bypass Passport entirely. The key helpers in `helpers.ts`:

- `seedUser(db)` — inserts a test user, returns the row
- `makeAuthApp(user, db)` — builds an Express app with the user injected via middleware (`req.user = user; req.isAuthenticated = () => true`)
- `createTestApp(userId?)` — full app including auth routes; pass a userId to simulate a logged-in user

**Important:** do not add `passport.initialize()` or `passport.session()` to test apps — it causes hangs because the serializer is not registered in tests.

## Key Env Vars

Backend `.env` (see `.env.example`):

| Variable | Notes |
|---|---|
| `LOCAL_AUTH_ENABLED` | Set to `true` to enable `/auth/local` login (dev only) |
| `LOCAL_USERS` | `username:password` pairs, comma-separated |
| `DB_PATH` | Defaults to `./data/expense_tracker.db` |
| `FRONTEND_URL` | Used for CORS and OAuth redirect |

Frontend has a single env var: `VITE_API_URL` (defaults to `http://localhost:3001`).
