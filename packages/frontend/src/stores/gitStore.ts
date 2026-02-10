import { create } from 'zustand';
import type { GitFileStatus, GitLogEntry, GitBranchInfo } from '@openloom/shared';
import * as api from '@/lib/api';

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
    try {
      const files = await api.gitStatus() as GitFileStatus[];
      if (Array.isArray(files)) set({ files });
    } catch { /* ignore */ }
  },

  fetchBranch: async () => {
    try {
      const branch = await api.gitBranches() as GitBranchInfo;
      if (branch.current) set({ branch });
    } catch { /* ignore */ }
  },

  fetchLog: async () => {
    try {
      const log = await api.gitLog() as GitLogEntry[];
      if (Array.isArray(log)) set({ log });
    } catch { /* ignore */ }
  },

  fetchSyncStatus: async () => {
    try {
      const { ahead, behind, hasRemote } = await api.gitSyncStatus();
      set({ ahead, behind, hasRemote });
    } catch { /* ignore */ }
  },

  stageFiles: async (paths) => {
    await api.gitStage(paths);
    await get().fetchStatus();
  },

  stageAll: async () => {
    const unstaged = get().files.filter((f) => !f.staged).map((f) => f.path);
    if (unstaged.length === 0) return;
    await api.gitStage(unstaged);
    await get().fetchStatus();
  },

  unstageFiles: async (paths) => {
    await api.gitUnstage(paths);
    await get().fetchStatus();
  },

  commit: async () => {
    const msg = get().commitMessage.trim();
    if (!msg) return false;
    set({ error: null });
    try {
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
    } catch (e: any) {
      set({ error: e.toString() || '提交失败' });
      return false;
    }
  },

  push: async () => {
    set({ error: null });
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
    try {
      // 先 pull 再 push
      try {
        await api.gitPull();
      } catch { /* 没有远程或无需 pull 时忽略 */ }
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
