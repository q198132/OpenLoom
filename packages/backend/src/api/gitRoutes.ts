import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);
const router = Router();
const cwd = process.cwd();

async function git(...args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd, maxBuffer: 1024 * 1024 });
  return stdout.trim();
}

// GET /api/git/status
router.get('/status', async (_req, res) => {
  try {
    const raw = await git('status', '--porcelain=v1');
    const files = raw
      .split('\n')
      .filter(Boolean)
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
      'log', '--oneline', '--format=%H|%h|%s|%an|%ci', '-20',
    );
    const entries = raw.split('\n').filter(Boolean).map((line) => {
      const [hash, shortHash, message, author, date] = line.split('|');
      return { hash, shortHash, message, author, date };
    });
    res.json(entries);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
