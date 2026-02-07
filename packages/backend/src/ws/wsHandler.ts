import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { WS_PTY_PATH, WS_CONTROL_PATH } from '@openloom/shared';
import type { ControlMessage } from '@openloom/shared';
import { PtyManager } from '../pty/ptyManager.js';

export function setupWebSocket(server: Server, ptyManager: PtyManager) {
  const wssData = new WebSocketServer({ noServer: true });
  const wssControl = new WebSocketServer({ noServer: true });

  // 存储控制通道客户端
  const controlClients = new Set<WebSocket>();

  // PTY 数据通道
  wssData.on('connection', (ws) => {
    console.log('[ws/pty] client connected');

    // PTY 输出 → WebSocket（保存取消函数）
    const removeDataListener = ptyManager.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // WebSocket → PTY 输入
    ws.on('message', (data) => {
      ptyManager.write(data.toString());
    });

    ws.on('close', () => {
      removeDataListener();
      console.log('[ws/pty] client disconnected');
    });
  });

  // 控制通道
  wssControl.on('connection', (ws) => {
    console.log('[ws/control] client connected');
    controlClients.add(ws);

    ws.on('message', (raw) => {
      try {
        const msg: ControlMessage = JSON.parse(raw.toString());
        handleControlMessage(msg, ptyManager);
      } catch (e) {
        console.error('[ws/control] invalid message:', e);
      }
    });

    ws.on('close', () => {
      controlClients.delete(ws);
      console.log('[ws/control] client disconnected');
    });
  });

  // HTTP Upgrade 路由
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url!, `http://${req.headers.host}`);

    if (pathname === WS_PTY_PATH) {
      wssData.handleUpgrade(req, socket, head, (ws) => {
        wssData.emit('connection', ws, req);
      });
    } else if (pathname === WS_CONTROL_PATH) {
      wssControl.handleUpgrade(req, socket, head, (ws) => {
        wssControl.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  // 广播控制消息给所有客户端
  function broadcast(msg: ControlMessage) {
    const data = JSON.stringify(msg);
    for (const client of controlClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  return { wssData, wssControl, broadcast };
}

function handleControlMessage(msg: ControlMessage, ptyManager: PtyManager) {
  switch (msg.type) {
    case 'pty-resize':
      ptyManager.resize(msg.cols, msg.rows);
      break;
  }
}
