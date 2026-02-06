import { create } from 'zustand';
import type { GitFileStatus, GitLogEntry, GitBranchInfo } from '@claudegui/shared';

interface GitState {
  files: GitFileStatus[];
  branch: GitBranchInfo | null;
  log: GitLogEntry[];
  loading: boolean;
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  fetchStatus: () => Promise<void>;
  fetchBranch: () => Promise<void>;
  fetchLog: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
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

  setCommitMessage: (commitMessage) => set({ commitMessage }),

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
    return false;
  },

  push: async () => {
    const res = await fetch('/api/git/push', { method: 'POST' });
    const data = await res.json();
    return !!data.ok;
  },

  pull: async () => {
    const res = await fetch('/api/git/pull', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      await get().fetchStatus();
    }
    return !!data.ok;
  },
}));
