import { Router } from 'express';
import { sshService } from '../services/sshService.js';
import type { SSHConnection } from '@openloom/shared';

const router = Router();

// GET /api/ssh/connections - 获取所有连接配置
router.get('/connections', (_req, res) => {
  try {
    const connections = sshService.getConnections();
    // 不返回密码字段
    const safeConnections = connections.map((c) => ({
      ...c,
      password: c.password ? '••••••••' : undefined,
    }));
    res.json(safeConnections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ssh/connections - 新增连接配置
router.post('/connections', (req, res) => {
  try {
    const { name, host, port, username, authType, privateKeyPath, password } = req.body;

    if (!name || !host || !username) {
      return res.status(400).json({ error: 'name, host, and username are required' });
    }

    const conn = sshService.addConnection({
      name,
      host,
      port: port || 22,
      username,
      authType: authType || 'password',
      privateKeyPath,
      password,
    });

    res.json({ ...conn, password: undefined });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ssh/connections/:id - 更新连接配置
router.put('/connections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const conn = sshService.updateConnection(id, updates);
    if (!conn) {
      return res.status(404).json({ error: 'Connection not found or cannot be modified' });
    }

    res.json({ ...conn, password: undefined });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/ssh/connections/:id - 删除连接配置
router.delete('/connections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = sshService.removeConnection(id);

    if (!success) {
      return res.status(404).json({ error: 'Connection not found or cannot be deleted' });
    }

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ssh/connect/:id - 建立连接
router.post('/connect/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await sshService.connect(id);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/ssh/disconnect - 断开连接
router.post('/disconnect', (_req, res) => {
  try {
    sshService.disconnect();
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ssh/session - 获取当前会话状态
router.get('/session', (_req, res) => {
  try {
    const session = sshService.getSession();
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ssh/files/tree - 获取远程文件树
router.get('/files/tree', async (req, res) => {
  try {
    const dir = (req.query.dir as string) || '.';
    const nodes = await sshService.getRemoteFileTree(dir);
    res.json(nodes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/ssh/files/read - 读取远程文件
router.get('/files/read', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'path required' });
    }

    const content = await sshService.readRemoteFile(filePath);
    res.json({ content, path: filePath });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/ssh/files/write - 写入远程文件
router.put('/files/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'path required' });
    }

    await sshService.writeRemoteFile(filePath, content);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/ssh/files/delete - 删除远程文件
router.delete('/files/delete', async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'path required' });
    }

    await sshService.deleteRemoteFile(filePath);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/ssh/files/mkdir - 创建远程目录
router.post('/files/mkdir', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: 'path required' });
    }

    await sshService.createRemoteDirectory(dirPath);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
