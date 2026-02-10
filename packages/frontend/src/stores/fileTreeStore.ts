import { create } from 'zustand';
import type { FileNode } from '@openloom/shared';
import * as api from '@/lib/api';

interface FileTreeState {
  nodes: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  loading: boolean;
  fetchChildren: (dir?: string) => Promise<FileNode[]>;
  toggleExpand: (path: string) => void;
  collapseAll: () => void;
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
    const nodes = await api.getFileTree(dir || undefined) as FileNode[];
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

  collapseAll: () => set({ expandedPaths: new Set() }),

  refreshRoot: async () => {
    set({ loading: true, expandedPaths: new Set(), selectedPath: null });
    const nodes = await get().fetchChildren('');
    set({ nodes, loading: false });
  },

  createFile: async (filePath: string) => {
    try {
      await api.createFile(filePath);
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },

  createDir: async (dirPath: string) => {
    try {
      await api.createDir(dirPath);
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },

  renameNode: async (oldPath: string, newPath: string) => {
    try {
      await api.renameNode(oldPath, newPath);
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },

  deleteNode: async (nodePath: string) => {
    try {
      await api.deleteNode(nodePath);
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },
}));
