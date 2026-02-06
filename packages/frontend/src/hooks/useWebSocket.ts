import { useEffect, useRef, useCallback } from 'react';
import { WS_CONTROL_PATH } from '@claudegui/shared';
import type { ControlMessage } from '@claudegui/shared';

export function useControlSocket(onMessage?: (msg: ControlMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}${WS_CONTROL_PATH}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg: ControlMessage = JSON.parse(e.data);
        onMessage?.(msg);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [onMessage]);

  const send = useCallback((msg: ControlMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
