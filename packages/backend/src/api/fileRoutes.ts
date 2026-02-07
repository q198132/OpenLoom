import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { IGNORED_DIRS, IGNORED_FILES } from '@claudegui/shared';
import type { FileNode } from '@claudegui/shared';
import { workspaceManager } from '../workspace/workspaceManager.js';

const router = Router();

function getRootDir(): string {
  return workspaceManager.getRoot();
}

// 路径安全校验
function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(getRootDir());
}

function safePath(relativePath: string): string {
  const full = path.join(getRootDir(), relativePath);
  if (!isPathSafe(full)) {
    throw new Error('Path traversal detected');
  }
  return full;
}

// GET /api/files/tree?dir=相对路径
router.get('/tree', async (req, res) => {
  try {
    const dir = (req.query.dir as string) || '';
    const fullPath = safePath(dir);

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (IGNORED_DIRS.includes(entry.name)) continue;
      if (IGNORED_FILES.includes(entry.name)) continue;

      nodes.push({
        name: entry.name,
        path: path.join(dir, entry.name).replace(/\\/g, '/'),
        isDirectory: entry.isDirectory(),
      });
    }

    // 排序：文件夹在前，按名称排序
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json(nodes);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/files/read?path=相对路径
router.get('/read', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const fullPath = safePath(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ content, path: filePath });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/files/write
router.put('/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const fullPath = safePath(filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
