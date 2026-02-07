import { create } from 'zustand';
import type { FileNode } from '@claudegui/shared';

interface FileTreeState {
  nodes: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  loading: boolean;
  fetchChildren: (dir?: string) => Promise<FileNode[]>;
  toggleExpand: (path: string) => void;
  setSelected: (path: string | null) => void;
  refreshRoot: () => Promise<void>;
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
}));
