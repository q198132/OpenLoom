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

// POST /api/files/create — 新建空文件
router.post('/create', async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const fullPath = safePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, '', 'utf-8');
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/files/mkdir — 新建文件夹
router.post('/mkdir', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'path required' });

    const fullPath = safePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/files/rename — 重命名
router.post('/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath required' });

    const fullOld = safePath(oldPath);
    const fullNew = safePath(newPath);
    await fs.rename(fullOld, fullNew);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/files/search?q=xxx&maxResults=100 — 搜索文件内容
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
]);

router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) return res.status(400).json({ error: 'q required' });

    const maxResults = Math.min(Number(req.query.maxResults) || 100, 500);
    const rootDir = getRootDir();
    const results: { file: string; line: string; lineNumber: number; column: number }[] = [];

    async function walk(dir: string, rel: string) {
      if (results.length >= maxResults) return;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (IGNORED_DIRS.includes(entry.name)) continue;
        if (IGNORED_FILES.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = (rel ? rel + '/' + entry.name : entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath, relPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (BINARY_EXTS.has(ext)) continue;
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) return;
              const col = lines[i].indexOf(query);
              if (col !== -1) {
                results.push({
                  file: relPath,
                  line: lines[i].substring(0, 200),
                  lineNumber: i + 1,
                  column: col,
                });
              }
            }
          } catch { /* skip unreadable files */ }
        }
      }
    }

    await walk(rootDir, '');
    res.json({ results });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/files/list — 递归列出所有文件路径
router.get('/list', async (req, res) => {
  try {
    const rootDir = getRootDir();
    const files: string[] = [];

    async function walk(dir: string, rel: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORED_DIRS.includes(entry.name)) continue;
        if (IGNORED_FILES.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = rel ? rel + '/' + entry.name : entry.name;

        if (entry.isDirectory()) {
          await walk(fullPath, relPath);
        } else {
          files.push(relPath);
        }
      }
    }

    await walk(rootDir, '');
    res.json(files);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/files/delete — 删除文件或目录
router.delete('/delete', async (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ error: 'path required' });

    const fullPath = safePath(targetPath);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
