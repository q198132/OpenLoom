import { create } from 'zustand';
import * as api from '@/lib/api';

interface WorkspaceState {
  currentPath: string;
  projectName: string;
  recentProjects: string[];
  browserOpen: boolean;
  error: string | null;
  fetchWorkspace: () => Promise<void>;
  openFolder: (path: string) => Promise<boolean>;
  fetchRecent: () => Promise<void>;
  setBrowserOpen: (open: boolean) => void;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentPath: '',
  projectName: '',
  recentProjects: [],
  browserOpen: false,
  error: null,

  fetchWorkspace: async () => {
    try {
      const data = await api.getWorkspace() as { path: string; projectName: string };
      set({ currentPath: data.path, projectName: data.projectName, error: null });
      if (data.projectName) document.title = `${data.projectName} - OpenLoom`;
    } catch (e: any) {
      console.warn('[Workspace] 获取工作区失败:', e.message || e);
    }
  },

  openFolder: async (path: string) => {
    try {
      set({ error: null });

      // 先清理旧状态
      const { useSSHStore } = await import('./sshStore');
      const { useFileTreeStore } = await import('./fileTreeStore');
      const { useGitStore } = await import('./gitStore');

      // 断开 SSH 连接（如果有的话）
      const sshSession = useSSHStore.getState().session;
      if (sshSession) {
        await useSSHStore.getState().disconnect();
      }

      // 清理文件树状态
      useFileTreeStore.setState({
        nodes: [],
        expandedPaths: new Set(),
        selectedPath: null,
        isRemote: false,
        remoteRoot: null,
      });

      // 清理 Git 状态
      useGitStore.setState({
        files: [],
        branch: null,
        log: [],
        error: null,
        ahead: 0,
        behind: 0,
        hasRemote: false,
      });

      // 打开新工作区
      const data = await api.openWorkspace(path) as { ok: boolean; path: string; projectName: string };
      if (data.ok) {
        set({
          currentPath: data.path,
          projectName: data.projectName,
          browserOpen: false,
        });
        if (data.projectName) document.title = `${data.projectName} - OpenLoom`;
        await get().fetchRecent();

        // 刷新文件树和 Git 状态
        useFileTreeStore.getState().refreshRoot();
        useGitStore.getState().fetchStatus();
        useGitStore.getState().fetchBranch();

        return true;
      }
      set({ error: '无法打开工作区' });
      return false;
    } catch (e: any) {
      const errorMsg = e.message || '打开工作区失败';
      set({ error: errorMsg });
      console.error('[Workspace] 打开工作区失败:', e);
      return false;
    }
  },

  fetchRecent: async () => {
    try {
      const list = await api.getRecent() as string[];
      if (Array.isArray(list)) set({ recentProjects: list });
    } catch (e: any) {
      console.warn('[Workspace] 获取最近项目失败:', e.message || e);
    }
  },

  setBrowserOpen: (open) => set({ browserOpen: open }),

  clearError: () => set({ error: null }),
}));
