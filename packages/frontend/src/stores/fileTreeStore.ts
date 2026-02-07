import { create } from 'zustand';
import type { FileNode } from '@openloom/shared';

interface FileTreeState {
  nodes: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  loading: boolean;
  fetchChildren: (dir?: string) => Promise<FileNode[]>;
  toggleExpand: (path: string) => void;
  setSelected: (path: string | null) => void;
  refreshRoot: () => Promise<void>;
  createFile: (filePath: string) => Promise<boolean>;
  createDir: (dirPath: string) => Promise<boolean>;
  renameNode: (oldPath: string, newPath: string) => Promise<boolean>;
  deleteNode: (nodePath: string) => Promise<boolean>;
}

export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  nodes: [],
  expandedPaths: new Set(),
  selectedPath: null,
  loading: false,

  fetchChildren: async (dir = '') => {
    const res = await fetch(`/api/files/tree?dir=${encodeURIComponent(dir)}`);
    const nodes: FileNode[] = await res.json();
    return nodes;
  },

  toggleExpand: (path: string) => {
    set((s) => {
      const next = new Set(s.expandedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedPaths: next };
    });
  },

  setSelected: (path) => set({ selectedPath: path }),

  refreshRoot: async () => {
    set({ loading: true, expandedPaths: new Set(), selectedPath: null });
    const nodes = await get().fetchChildren('');
    set({ nodes, loading: false });
  },

  createFile: async (filePath: string) => {
    try {
      const res = await fetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      if (!res.ok) return false;
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },

  createDir: async (dirPath: string) => {
    try {
      const res = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath }),
      });
      if (!res.ok) return false;
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },

  renameNode: async (oldPath: string, newPath: string) => {
    try {
      const res = await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      if (!res.ok) return false;
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },

  deleteNode: async (nodePath: string) => {
    try {
      const res = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: nodePath }),
      });
      if (!res.ok) return false;
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },
}));
