import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { DEFAULT_PORT, API_PREFIX } from '@claudegui/shared';
import { PtyManager } from './pty/ptyManager.js';
import { setupWebSocket } from './ws/wsHandler.js';
import fileRoutes, { rootDir } from './api/fileRoutes.js';
import { startFileWatcher } from './watcher/fileWatcher.js';

const app = express();
app.use(cors());
app.use(express.json());

// 健康检查
app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const server = createServer(app);
const ptyManager = new PtyManager();

// 启动 PTY
ptyManager.spawn();
console.log(`[pty] spawned, pid: ${ptyManager.pid}`);

// 设置 WebSocket
const { broadcast } = setupWebSocket(server, ptyManager);

// 导出供后续模块使用
export { app, broadcast, ptyManager };

const port = Number(process.env.PORT) || DEFAULT_PORT;
server.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
