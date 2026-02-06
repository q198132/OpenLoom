import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { IGNORED_DIRS } from '@claudegui/shared';
import type { ControlMessage } from '@claudegui/shared';

// 文件快照缓存（用于 Diff Review）
const snapshotCache = new Map<string, string>();

export function startFileWatcher(
  rootDir: string,
  broadcast: (msg: ControlMessage) => void,
) {
  const ignored = IGNORED_DIRS.map((d) => `**/${d}/**`);

  const watcher = chokidar.watch(rootDir, {
    ignored,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('change', async (filePath) => {
    const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const oldContent = snapshotCache.get(rel) ?? '';

    try {
      const newContent = await fs.readFile(filePath, 'utf-8');

      // 内容没变则跳过
      if (oldContent === newContent) return;

      // 发送快照给前端审核
      broadcast({
        type: 'file-snapshot',
        path: rel,
        oldContent,
        newContent,
      });

      // 更新缓存为新内容（如果被 reject 会由前端触发写回）
      snapshotCache.set(rel, newContent);
    } catch {
      // 文件可能被删除
    }
  });

  watcher.on('add', async (filePath) => {
    const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      snapshotCache.set(rel, content);
    } catch { /* ignore */ }

    broadcast({ type: 'file-changed', event: 'add', path: rel });
  });

  watcher.on('unlink', (filePath) => {
    const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
    snapshotCache.delete(rel);
    broadcast({ type: 'file-changed', event: 'unlink', path: rel });
  });

  watcher.on('addDir', (filePath) => {
    const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
    broadcast({ type: 'file-changed', event: 'addDir', path: rel });
  });

  watcher.on('unlinkDir', (filePath) => {
    const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
    broadcast({ type: 'file-changed', event: 'unlinkDir', path: rel });
  });

  return { watcher, snapshotCache };
}

// 缓存一个文件的快照（首次读取时调用）
export async function cacheSnapshot(rel: string, rootDir: string) {
  if (snapshotCache.has(rel)) return;
  try {
    const full = path.join(rootDir, rel);
    const content = await fs.readFile(full, 'utf-8');
    snapshotCache.set(rel, content);
  } catch { /* ignore */ }
}

export { snapshotCache };
