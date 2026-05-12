import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import { RequestHandler } from 'express';
import { checkAndFireAlerts } from './alerts';

interface AlertClient extends WebSocket {
  userId?: number;
}

interface SessionRequest extends http.IncomingMessage {
  session?: { passport?: { user?: number } };
}

export function initWebSocket(
  server: http.Server,
  sessionMiddleware: RequestHandler,
  db: Database.Database
): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: AlertClient, req: SessionRequest) => {
    (sessionMiddleware as (req: SessionRequest, res: object, next: () => void) => void)(req, {}, () => {
      const userId = req.session?.passport?.user;
      if (!userId) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      ws.userId = userId;

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string };
          if (msg.type === 'subscribe') {
            const d = new Date();
            checkAndFireAlerts(db, wss, ws.userId!, d.getFullYear(), d.getMonth() + 1);
          }
        } catch (_) { /* ignore malformed messages */ }
      });
    });
  });

  return wss;
}
