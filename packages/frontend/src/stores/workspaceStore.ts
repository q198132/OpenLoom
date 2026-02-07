import { create } from 'zustand';

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
      const res = await fetch('/api/workspace');
      const data = await res.json();
      set({ currentPath: data.path, projectName: data.projectName });
      if (data.projectName) document.title = `${data.projectName} - OpenLoom`;
    } catch { /* ignore */ }
  },

  openFolder: async (path: string) => {
    try {
      const res = await fetch('/api/workspace/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
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
      const res = await fetch('/api/workspace/recent');
      const list = await res.json();
      if (Array.isArray(list)) set({ recentProjects: list });
    } catch { /* ignore */ }
  },

  setBrowserOpen: (open) => set({ browserOpen: open }),
}));
