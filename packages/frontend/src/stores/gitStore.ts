import { create } from 'zustand';
import type { GitFileStatus, GitLogEntry, GitBranchInfo } from '@claudegui/shared';

interface GitState {
  files: GitFileStatus[];
  branch: GitBranchInfo | null;
  log: GitLogEntry[];
  loading: boolean;
  commitMessage: string;
  error: string | null;
  setCommitMessage: (msg: string) => void;
  clearError: () => void;
  fetchStatus: () => Promise<void>;
  fetchBranch: () => Promise<void>;
  fetchLog: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  commit: () => Promise<boolean>;
  push: () => Promise<boolean>;
  pull: () => Promise<boolean>;
}

export const useGitStore = create<GitState>((set, get) => ({
  files: [],
  branch: null,
  log: [],
  loading: false,
  commitMessage: '',
  error: null,

  setCommitMessage: (commitMessage) => set({ commitMessage }),
  clearError: () => set({ error: null }),

  fetchStatus: async () => {
    try {
      const res = await fetch('/api/git/status');
      const files = await res.json();
      if (Array.isArray(files)) set({ files });
    } catch { /* ignore */ }
  },

  fetchBranch: async () => {
    try {
      const res = await fetch('/api/git/branches');
      const branch = await res.json();
      if (branch.current) set({ branch });
    } catch { /* ignore */ }
  },

  fetchLog: async () => {
    try {
      const res = await fetch('/api/git/log');
      const log = await res.json();
      if (Array.isArray(log)) set({ log });
    } catch { /* ignore */ }
  },

  stageFiles: async (paths) => {
    await fetch('/api/git/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
    await get().fetchStatus();
  },

  stageAll: async () => {
    const unstaged = get().files.filter((f) => !f.staged).map((f) => f.path);
    if (unstaged.length === 0) return;
    await fetch('/api/git/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: unstaged }),
    });
    await get().fetchStatus();
  },

  unstageFiles: async (paths) => {
    await fetch('/api/git/unstage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
    await get().fetchStatus();
  },

  commit: async () => {
    const msg = get().commitMessage.trim();
    if (!msg) return false;
    set({ error: null });
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.ok) {
        set({ commitMessage: '' });
        await get().fetchStatus();
        await get().fetchLog();
        return true;
      }
      set({ error: data.error || '提交失败' });
      return false;
    } catch (e: any) {
      set({ error: e.message || '提交失败' });
      return false;
    }
  },

  push: async () => {
    set({ error: null });
    try {
      const res = await fetch('/api/git/push', { method: 'POST' });
      const data = await res.json();
      if (data.error) set({ error: data.error });
      return !!data.ok;
    } catch (e: any) {
      set({ error: e.message || 'Push 失败' });
      return false;
    }
  },

  pull: async () => {
    set({ error: null });
    try {
      const res = await fetch('/api/git/pull', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        await get().fetchStatus();
        return true;
      }
      set({ error: data.error || 'Pull 失败' });
      return false;
    } catch (e: any) {
      set({ error: e.message || 'Pull 失败' });
      return false;
    }
  },
}));
