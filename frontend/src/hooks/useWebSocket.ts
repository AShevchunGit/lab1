import { useEffect, useRef } from 'react';

// When VITE_API_URL is empty (same-origin behind nginx), derive WS URL from window.location.
const WS_URL = (() => {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
  if (!apiUrl) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  return apiUrl.replace(/^http/, 'ws');
})();

export interface WsMessage {
  type: string;
  threshold?: number;
  usagePct?: number;
  spent?: number;
  budget?: number;
}

export function useWebSocket(onMessage: (msg: WsMessage) => void): void {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    unmounted.current = false;

    function connect() {
      if (unmounted.current) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe' }));

      ws.onmessage = (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data as string) as WsMessage;
          onMessageRef.current(msg);
        } catch (_) { /* ignore */ }
      };

      ws.onclose = () => {
        if (!unmounted.current) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);
}
