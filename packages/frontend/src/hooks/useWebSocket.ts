import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { ControlMessage } from '@openloom/shared';

export function sendControlMessage(_msg: ControlMessage) {
  // Tauri 模式下不需要发送控制消息，PTY resize 等由插件处理
}

export function useControlSocket(
  onMessage?: (msg: ControlMessage) => void,
) {
  useEffect(() => {
    if (!onMessage) return;

    const unlisten = listen<ControlMessage>('file-changed', (event) => {
      onMessage(event.payload as ControlMessage);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onMessage]);

  return { send: sendControlMessage };
}
