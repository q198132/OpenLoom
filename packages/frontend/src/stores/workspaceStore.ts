import { create } from 'zustand';
import * as api from '@/lib/api';

interface WorkspaceState {
  currentPath: string;
  projectName: string;
  recentProjects: string[];
  browserOpen: boolean;
  fetchWorkspace: () => Promise<void>;
  openFolder: (path: string) => Promise<boolean>;
  fetchRecent: () => Promise<void>;
  setBrowserOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentPath: '',
  projectName: '',
  recentProjects: [],
  browserOpen: false,

  fetchWorkspace: async () => {
    try {
      const data = await api.getWorkspace() as any;
      set({ currentPath: data.path, projectName: data.projectName });
      if (data.projectName) document.title = `${data.projectName} - OpenLoom`;
    } catch { /* ignore */ }
  },

  openFolder: async (path: string) => {
    try {
      const data = await api.openWorkspace(path) as any;
      if (data.ok) {
        set({
          currentPath: data.path,
          projectName: data.projectName,
          browserOpen: false,
        });
        await get().fetchRecent();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  fetchRecent: async () => {
    try {
      const list = await api.getRecent() as string[];
      if (Array.isArray(list)) set({ recentProjects: list });
    } catch { /* ignore */ }
  },

  setBrowserOpen: (open) => set({ browserOpen: open }),
}));
