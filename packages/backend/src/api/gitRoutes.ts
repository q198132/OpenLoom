import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { workspaceManager } from '../workspace/workspaceManager.js';

const exec = promisify(execFile);
const router = Router();

function getCwd(): string {
  return workspaceManager.getRoot();
}

async function git(...args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd: getCwd(), maxBuffer: 1024 * 1024 });
  return stdout.trim();
}

// GET /api/git/status
router.get('/status', async (_req, res) => {
  try {
    // 不能用 git() 因为 trim() 会去掉行首空格，而 porcelain 格式中空格有意义
    const { stdout } = await exec('git', ['status', '--porcelain=v1'], { cwd: getCwd() });
    const files = stdout
      .split('\n')
      .filter((l) => l.length >= 2)
      .map((line) => {
        const x = line[0]; // index status
        const y = line[1]; // worktree status
        const filePath = line.slice(3).trim();

        let status: string;
        if (x === '?' && y === '?') status = 'untracked';
        else if (x === 'A' || y === 'A') status = 'added';
        else if (x === 'D' || y === 'D') status = 'deleted';
        else if (x === 'R' || y === 'R') status = 'renamed';
        else status = 'modified';

        const staged = x !== ' ' && x !== '?';
        return { path: filePath, status, staged };
      });

    res.json(files);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/git/stage
router.post('/stage', async (req, res) => {
  try {
    const { paths } = req.body as { paths: string[] };
    await git('add', ...paths);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/git/unstage
router.post('/unstage', async (req, res) => {
  try {
    const { paths } = req.body as { paths: string[] };
    await git('reset', 'HEAD', ...paths);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/git/commit
router.post('/commit', async (req, res) => {
  try {
    const { message } = req.body as { message: string };
    const result = await git('commit', '-m', message);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/git/branches
router.get('/branches', async (_req, res) => {
  try {
    const raw = await git('branch', '--no-color');
    const lines = raw.split('\n').filter(Boolean);
    let current = '';
    const branches: string[] = [];
    for (const line of lines) {
      const name = line.replace(/^\*?\s+/, '').trim();
      if (line.startsWith('*')) current = name;
      branches.push(name);
    }
    res.json({ current, branches });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/git/log
router.get('/log', async (_req, res) => {
  try {
    const raw = await git(
      'log', '--all', '--format=%H|%h|%s|%an|%ci|%D', '-30',
    );
    const entries = raw.split('\n').filter(Boolean).map((line) => {
      const [hash, shortHash, message, author, date, refs] = line.split('|');
      return { hash, shortHash, message, author, date, refs: refs || '' };
    });
    res.json(entries);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/git/show/:hash
router.get('/show/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const info = await git(
      'show', '--stat=999', '--format=%H|%h|%s|%an|%ae|%ci|%b', hash,
    );
    const lines = info.split('\n');
    const [fullHash, shortHash, subject, author, email, date, ...rest] = lines[0].split('|');
    const body = rest.join('|').trim();

    const changedFiles: { file: string; stats: string }[] = [];
    for (const fl of lines.slice(1)) {
      const match = fl.match(/^\s*(.+?)\s+\|\s+(.+)$/);
      if (match) {
        changedFiles.push({ file: match[1].trim(), stats: match[2].trim() });
      }
    }

    res.json({
      hash: fullHash, shortHash, subject, author, email, date, body,
      files: changedFiles,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/git/file-diff/:hash?file=xxx — 获取某个 commit 中某文件的新旧内容
router.get('/file-diff/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const file = req.query.file as string;
    if (!file) return res.status(400).json({ error: 'file required' });

    let oldContent = '';
    let newContent = '';

    // 新版本内容
    try {
      newContent = await git('show', `${hash}:${file}`);
    } catch { /* 文件可能是删除的 */ }

    // 旧版本内容（parent commit）
    try {
      oldContent = await git('show', `${hash}~1:${file}`);
    } catch { /* 文件可能是新增的 */ }

    res.json({ oldContent, newContent, file });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/git/staged-diff — 获取暂存区 diff 摘要
router.get('/staged-diff', async (_req, res) => {
  try {
    const stat = await git('diff', '--cached', '--stat');
    const { stdout: diffRaw } = await exec('git', ['diff', '--cached'], {
      cwd: getCwd(),
      maxBuffer: 2 * 1024 * 1024,
    });
    // 截断过长的 diff（最多 30KB）
    const maxLen = 30 * 1024;
    const diff = diffRaw.length > maxLen
      ? diffRaw.slice(0, maxLen) + '\n... [diff truncated]'
      : diffRaw;

    // 解析文件列表
    const statusOut = await git('diff', '--cached', '--name-status');
    const files = statusOut
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('\t');
        return { status: parts[0], path: parts.slice(1).join('\t') };
      });

    res.json({ stat, diff, files });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/git/push
router.post('/push', async (_req, res) => {
  try {
    const result = await git('push');
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/git/pull
router.post('/pull', async (_req, res) => {
  try {
    const result = await git('pull');
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/git/working-diff?file=xxx&staged=true|false — 获取工作区文件的 diff 内容
router.get('/working-diff', async (req, res) => {
  try {
    const file = req.query.file as string;
    const staged = req.query.staged === 'true';
    if (!file) return res.status(400).json({ error: 'file required' });

    let oldContent = '';
    let newContent = '';

    if (staged) {
      // 暂存区 vs HEAD：old = HEAD版本, new = 暂存区版本
      try { oldContent = await git('show', `HEAD:${file}`); } catch { /* 新文件 */ }
      try { newContent = await git('show', `:${file}`); } catch { /* 删除的文件 */ }
    } else {
      // 工作区 vs 暂存区(或HEAD)：old = 暂存区版本, new = 工作区版本
      try { oldContent = await git('show', `:${file}`); } catch {
        try { oldContent = await git('show', `HEAD:${file}`); } catch { /* 新文件 */ }
      }
      const fs = await import('fs/promises');
      const path = await import('path');
      try {
        newContent = await fs.readFile(path.join(getCwd(), file), 'utf-8');
      } catch { /* 删除的文件 */ }
    }

    res.json({ oldContent, newContent, file });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
