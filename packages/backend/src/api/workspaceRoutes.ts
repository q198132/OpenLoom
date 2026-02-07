import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { workspaceManager } from '../workspace/workspaceManager.js';

const router = Router();

// GET /api/workspace — 返回当前工作区信息
router.get('/', (_req, res) => {
  res.json({
    path: workspaceManager.getRoot(),
    projectName: workspaceManager.getProjectName(),
  });
});

// POST /api/workspace/open — 切换工作区
router.post('/open', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'path required' });

    const resolved = path.resolve(dirPath);
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'not a directory' });
    }

    workspaceManager.setRoot(resolved);
    res.json({
      ok: true,
      path: workspaceManager.getRoot(),
      projectName: workspaceManager.getProjectName(),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/workspace/browse?dir=xxx — 浏览目录
router.get('/browse', async (req, res) => {
  try {
    const dir = (req.query.dir as string) || workspaceManager.getRoot();
    const resolved = path.resolve(dir);
    const entries = await fs.readdir(resolved, { withFileTypes: true });

    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: path.join(resolved, e.name).replace(/\\/g, '/'),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      current: resolved.replace(/\\/g, '/'),
      parent: path.dirname(resolved).replace(/\\/g, '/'),
      dirs,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/workspace/recent — 返回最近项目列表
router.get('/recent', (_req, res) => {
  res.json(workspaceManager.getRecent());
});

export default router;
