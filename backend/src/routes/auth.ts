import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import Database from 'better-sqlite3';
import { requireAuth } from '../middleware/auth';

interface UserRow {
  id: number;
  provider: string;
  provider_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

export function createAuthRouter(db: Database.Database): Router {
  const router = Router();

  const upsertUser = db.prepare<[string, string, string | null, string | null, string | null]>(`
    INSERT INTO users (provider, provider_id, email, name, avatar_url)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url
    RETURNING id, provider, provider_id, email, name, avatar_url
  `);

  const findUser = db.prepare<[number]>('SELECT * FROM users WHERE id = ?');

  passport.serializeUser((user, done) => done(null, (user as UserRow).id));
  passport.deserializeUser((id: number, done) => {
    try {
      const user = findUser.get(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/google/callback`,
      },
      (_access, _refresh, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const avatar = profile.photos?.[0]?.value ?? null;
          const user = upsertUser.get('google', profile.id, email, profile.displayName, avatar);
          done(null, user as UserRow);
        } catch (err) {
          done(err as Error);
        }
      }
    ));
  }

  if (process.env.GITHUB_CLIENT_ID) {
    passport.use(new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/github/callback`,
      },
      (_access: string, _refresh: string, profile: { id: string; emails?: Array<{ value: string }>; photos?: Array<{ value: string }>; displayName?: string; username?: string }, done: (err: Error | null, user?: UserRow) => void) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const avatar = profile.photos?.[0]?.value ?? null;
          const user = upsertUser.get('github', profile.id, email, profile.displayName || profile.username || null, avatar);
          done(null, user as UserRow);
        } catch (err) {
          done(err as Error);
        }
      }
    ));
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: `${frontendUrl}/login` }),
    (_req: Request, res: Response) => res.redirect(frontendUrl)
  );

  router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
  router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: `${frontendUrl}/login` }),
    (_req: Request, res: Response) => res.redirect(frontendUrl)
  );

  router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => res.json({ ok: true }));
    });
  });

  // Local hardcoded users — enabled only when LOCAL_AUTH_ENABLED=true
  router.get('/local/enabled', (_req: Request, res: Response) => {
    res.json({ enabled: process.env.LOCAL_AUTH_ENABLED === 'true' });
  });

  router.post('/local', (req: Request, res: Response, next: NextFunction) => {
    if (process.env.LOCAL_AUTH_ENABLED !== 'true') {
      return res.status(404).json({ error: 'Local auth is not enabled' });
    }

    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const entries = (process.env.LOCAL_USERS || '').split(',').map((e) => e.trim());
    const match = entries.find((e) => {
      const [u, p] = e.split(':');
      return u === username && p === password;
    });

    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const user = upsertUser.get('local', username, `${username}@local`, username, null) as UserRow;

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ id: user.id, provider: user.provider, email: user.email, name: user.name, avatar_url: user.avatar_url });
    });
  });

  router.get('/me', requireAuth, (req: Request, res: Response) => {
    const u = req.user as UserRow;
    res.json({ id: u.id, provider: u.provider, email: u.email, name: u.name, avatar_url: u.avatar_url });
  });

  return router;
}
