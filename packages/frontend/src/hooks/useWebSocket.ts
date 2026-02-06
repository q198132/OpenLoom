import { useEffect } from 'react';
import { WS_CONTROL_PATH } from '@claudegui/shared';
import type { ControlMessage } from '@claudegui/shared';

// 单例控制通道
let ws: WebSocket | null = null;
let listeners = new Set<(msg: ControlMessage) => void>();
let connectTimer: ReturnType<typeof setTimeout> | null = null;
let pendingMessages: ControlMessage[] = [];

function ensureConnection() {
  if (ws && ws.readyState <= WebSocket.OPEN) return;

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${location.host}${WS_CONTROL_PATH}`;
  ws = new WebSocket(url);

  ws.onmessage = (e) => {
    try {
      const msg: ControlMessage = JSON.parse(e.data);
      for (const fn of listeners) fn(msg);
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    ws = null;
    // 自动重连
    if (listeners.size > 0) {
      connectTimer = setTimeout(ensureConnection, 2000);
    }
  };
}

export function sendControlMessage(msg: ControlMessage) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function useControlSocket(
  onMessage?: (msg: ControlMessage) => void,
) {
  useEffect(() => {
    ensureConnection();

    if (onMessage) {
      listeners.add(onMessage);
    }

    return () => {
      if (onMessage) {
        listeners.delete(onMessage);
      }
      // 没有监听者时关闭连接
      if (listeners.size === 0 && ws) {
        if (connectTimer) clearTimeout(connectTimer);
        ws.close();
        ws = null;
      }
    };
  }, [onMessage]);

  return { send: sendControlMessage };
}
