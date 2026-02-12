import { create } from 'zustand';
import type { GitFileStatus, GitLogEntry, GitBranchInfo } from '@openloom/shared';
import * as api from '@/lib/api';
import { useSSHStore } from './sshStore';

// 解析 SSH git status 输出
function parseSshGitStatus(output: string): GitFileStatus[] {
  const files: GitFileStatus[] = [];
  for (const line of output.trim().split('\n')) {
    if (!line.trim()) continue;
    // 格式: XY path (XY 是状态码，如 M, A, D, ?? 等)
    const status = line.substring(0, 2).trim();
    const path = line.substring(3).trim();
    if (!path) continue;

    let fileStatus: 'untracked' | 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
    let staged = false;

    if (status === '??') {
      fileStatus = 'untracked';
    } else if (status === 'A ' || status === 'M ') {
      fileStatus = status === 'A ' ? 'added' : 'modified';
      staged = true;
    } else if (status === ' D') {
      fileStatus = 'deleted';
    } else if (status === 'D ') {
      fileStatus = 'deleted';
      staged = true;
    } else if (status.startsWith('R')) {
      fileStatus = 'renamed';
    } else if (status.includes('M')) {
      fileStatus = 'modified';
      staged = status[0] !== ' ' && status[0] !== '?';
    }

    files.push({ path, status: fileStatus, staged });
  }
  return files;
}

// 解析 SSH git log 输出
function parseSshGitLog(output: string): GitLogEntry[] {
  const entries: GitLogEntry[] = [];
  for (const line of output.trim().split('\n')) {
    if (!line.trim()) continue;
    // 格式: hash|shortHash|subject|author|date
    const parts = line.split('|');
    if (parts.length >= 5) {
      entries.push({
        hash: parts[0],
        shortHash: parts[1],
        message: parts[2],
        author: parts[3],
        date: parts[4],
        refs: '',
      });
    }
  }
  return entries;
}

// 解析 SSH git branches 输出
function parseSshGitBranches(output: string): GitBranchInfo {
  const lines = output.trim().split('\n');
  const branches: string[] = [];
  let current = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ')) {
      current = trimmed.substring(2);
      branches.push(current);
    } else if (trimmed && !trimmed.startsWith('remotes/')) {
      branches.push(trimmed);
    }
  }

  return { current, branches };
}

interface GitState {
  files: GitFileStatus[];
  branch: GitBranchInfo | null;
  log: GitLogEntry[];
  loading: boolean;
  commitMessage: string;
  error: string | null;
  ahead: number;
  behind: number;
  hasRemote: boolean;
  syncing: boolean;
  setCommitMessage: (msg: string) => void;
  clearError: () => void;
  fetchStatus: () => Promise<void>;
  fetchBranch: () => Promise<void>;
  fetchLog: () => Promise<void>;
  fetchSyncStatus: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  commit: () => Promise<boolean>;
  push: () => Promise<boolean>;
  pull: () => Promise<boolean>;
  sync: () => Promise<boolean>;
}

export const useGitStore = create<GitState>((set, get) => ({
  files: [],
  branch: null,
  log: [],
  loading: false,
  commitMessage: '',
  error: null,
  ahead: 0,
  behind: 0,
  hasRemote: false,
  syncing: false,

  setCommitMessage: (commitMessage) => set({ commitMessage }),
  clearError: () => set({ error: null }),

  fetchStatus: async () => {
    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    try {
      if (isRemote) {
        // SSH 模式
        const output = await api.sshGitStatus();
        const files = parseSshGitStatus(output);
        set({ files, error: null });
      } else {
        // 本地模式
        const files = await api.gitStatus() as GitFileStatus[];
        if (Array.isArray(files)) set({ files, error: null });
      }
    } catch (e: any) {
      // Git 状态获取失败，可能是非 Git 目录，静默处理
      set({ files: [] });
      if (isRemote && e.message?.includes('Not a git repository')) {
        // SSH 远程非 Git 目录，正常情况
      } else if (!e.message?.includes('Not a git repository')) {
        console.warn('[Git] 获取状态失败:', e.message || e);
      }
    }
  },

  fetchBranch: async () => {
    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    try {
      if (isRemote) {
        const output = await api.sshGitBranches();
        const branch = parseSshGitBranches(output);
        if (branch.current) set({ branch, error: null });
      } else {
        const branch = await api.gitBranches() as GitBranchInfo;
        if (branch.current) set({ branch, error: null });
      }
    } catch (e: any) {
      // 分支信息获取失败，静默处理
      set({ branch: null });
      if (!e.message?.includes('Not a git repository')) {
        console.warn('[Git] 获取分支信息失败:', e.message || e);
      }
    }
  },

  fetchLog: async () => {
    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    try {
      if (isRemote) {
        const output = await api.sshGitLog();
        const log = parseSshGitLog(output);
        set({ log, error: null });
      } else {
        const log = await api.gitLog() as GitLogEntry[];
        if (Array.isArray(log)) set({ log, error: null });
      }
    } catch (e: any) {
      // 日志获取失败，静默处理
      set({ log: [] });
      if (!e.message?.includes('Not a git repository')) {
        console.warn('[Git] 获取日志失败:', e.message || e);
      }
    }
  },

  fetchSyncStatus: async () => {
    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    // SSH 模式暂不支持同步状态
    if (isRemote) {
      set({ ahead: 0, behind: 0, hasRemote: false });
      return;
    }

    try {
      const { ahead, behind, hasRemote } = await api.gitSyncStatus();
      set({ ahead, behind, hasRemote, error: null });
    } catch (e: any) {
      // 同步状态获取失败，可能是无远程仓库
      set({ ahead: 0, behind: 0, hasRemote: false });
      if (!e.message?.includes('No remote')) {
        console.warn('[Git] 获取同步状态失败:', e.message || e);
      }
    }
  },

  stageFiles: async (paths) => {
    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    if (isRemote) {
      await api.sshGitStage(paths);
    } else {
      await api.gitStage(paths);
    }
    await get().fetchStatus();
  },

  stageAll: async () => {
    const unstaged = get().files.filter((f) => !f.staged).map((f) => f.path);
    if (unstaged.length === 0) return;

    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    if (isRemote) {
      await api.sshGitStage(unstaged);
    } else {
      await api.gitStage(unstaged);
    }
    await get().fetchStatus();
  },

  unstageFiles: async (paths) => {
    // SSH 模式暂不支持 unstage
    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    if (!isRemote) {
      await api.gitUnstage(paths);
      await get().fetchStatus();
    }
  },

  commit: async () => {
    const msg = get().commitMessage.trim();
    if (!msg) return false;
    set({ error: null });

    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    try {
      if (isRemote) {
        await api.sshGitCommit(msg);
        set({ commitMessage: '' });
        await get().fetchStatus();
        await get().fetchLog();
        return true;
      } else {
        const data = await api.gitCommit(msg) as any;
        if (data.ok) {
          set({ commitMessage: '' });
          await get().fetchStatus();
          await get().fetchLog();
          await get().fetchSyncStatus();
          return true;
        }
        set({ error: '提交失败' });
        return false;
      }
    } catch (e: any) {
      set({ error: e.toString() || '提交失败' });
      return false;
    }
  },

  push: async () => {
    set({ error: null });

    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    // SSH 模式暂不支持 push（需要更复杂的实现）
    if (isRemote) {
      set({ error: 'SSH 模式暂不支持 Push' });
      return false;
    }

    try {
      const data = await api.gitPush() as any;
      return !!data.ok;
    } catch (e: any) {
      set({ error: e.toString() || 'Push 失败' });
      return false;
    }
  },

  pull: async () => {
    set({ error: null });

    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    // SSH 模式暂不支持 pull
    if (isRemote) {
      set({ error: 'SSH 模式暂不支持 Pull' });
      return false;
    }

    try {
      const data = await api.gitPull() as any;
      if (data.ok) {
        await get().fetchStatus();
        await get().fetchSyncStatus();
        return true;
      }
      set({ error: 'Pull 失败' });
      return false;
    } catch (e: any) {
      set({ error: e.toString() || 'Pull 失败' });
      return false;
    }
  },

  sync: async () => {
    set({ syncing: true, error: null });

    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    // SSH 模式暂不支持 sync
    if (isRemote) {
      set({ error: 'SSH 模式暂不支持同步', syncing: false });
      return false;
    }

    try {
      // 尝试 pull，失败时继续尝试 push
      try {
        await api.gitPull();
      } catch (pullError: any) {
        // Pull 失败可能是没有远程分支差异或网络问题，继续尝试 push
        console.warn('[Git] Pull 失败，继续尝试 Push:', pullError.message || pullError);
      }
      const data = await api.gitPush() as any;
      if (data.ok) {
        await Promise.all([get().fetchStatus(), get().fetchLog(), get().fetchSyncStatus()]);
        return true;
      }
      set({ error: '同步失败' });
      return false;
    } catch (e: any) {
      set({ error: e.toString() || '同步失败' });
      return false;
    } finally {
      set({ syncing: false });
    }
  },
}));
