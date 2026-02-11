import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { DEFAULT_PORT, API_PREFIX } from '@openloom/shared';
import { PtyManager } from './pty/ptyManager.js';
import { setupWebSocket } from './ws/wsHandler.js';
import fileRoutes from './api/fileRoutes.js';
import gitRoutes from './api/gitRoutes.js';
import aiRoutes from './api/aiRoutes.js';
import workspaceRoutes from './api/workspaceRoutes.js';
import sshRoutes from './api/sshRoutes.js';
import { startFileWatcher } from './watcher/fileWatcher.js';
import { workspaceManager } from './workspace/workspaceManager.js';

const app = express();
app.use(cors());
app.use(express.json());

// 健康检查
app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 文件系统 API
app.use(`${API_PREFIX}/files`, fileRoutes);

// Git API
app.use(`${API_PREFIX}/git`, gitRoutes);

// AI API
app.use(`${API_PREFIX}/ai`, aiRoutes);

// 工作区 API
app.use(`${API_PREFIX}/workspace`, workspaceRoutes);

// SSH API
app.use(`${API_PREFIX}/ssh`, sshRoutes);

const server = createServer(app);
const ptyManager = new PtyManager();

// 启动 PTY
ptyManager.spawn();
console.log(`[pty] spawned, pid: ${ptyManager.pid}`);

// 设置 WebSocket
const { broadcast } = setupWebSocket(server, ptyManager);

// 启动文件监听
const initialRoot = workspaceManager.getRoot();
let currentWatcher = startFileWatcher(initialRoot, broadcast);
console.log(`[watcher] watching ${initialRoot}`);

// 工作区切换回调
workspaceManager.onChange((newRoot) => {
  // 停止旧 watcher
  currentWatcher.watcher.close();
  currentWatcher.snapshotCache.clear();

  // 启动新 watcher
  currentWatcher = startFileWatcher(newRoot, broadcast);
  console.log(`[watcher] switched to ${newRoot}`);

  // 终端发送 cd 命令
  const cdCmd = process.platform === 'win32'
    ? `cd "${newRoot}"\r`
    : `cd "${newRoot}"\n`;
  ptyManager.write(cdCmd);

  // 广播工作区切换消息
  broadcast({
    type: 'workspace-changed',
    path: newRoot,
    projectName: workspaceManager.getProjectName(),
  });
});

// 导出供后续模块使用
export { app, broadcast, ptyManager };

const port = Number(process.env.PORT) || DEFAULT_PORT;
server.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
