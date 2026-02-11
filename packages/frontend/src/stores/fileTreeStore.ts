import { create } from 'zustand';
import type { FileNode } from '@openloom/shared';
import * as api from '@/lib/api';
import { useSSHStore } from './sshStore';

interface FileTreeState {
  nodes: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  loading: boolean;
  isRemote: boolean;
  remoteRoot: string | null;  // 远程根目录
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
  isRemote: false,
  remoteRoot: null,

  fetchChildren: async (dir = '') => {
    const sshStore = useSSHStore.getState();
    const sshSession = sshStore.session;
    const workingDir = sshStore.workingDir;
    const isRemote = sshSession?.status === 'connected';

    try {
      let nodes: FileNode[];
      if (isRemote) {
        // SSH 模式：如果 dir 为空，使用工作目录；否则使用传入的路径
        const path = dir || workingDir || '/';
        nodes = await api.sshGetFileTree(path) as FileNode[];
      } else {
        nodes = await api.getFileTree(dir || undefined) as FileNode[];
      }
      console.log(`[FileTree] fetchChildren("${dir || workingDir || '/'}") returned ${nodes?.length || 0} nodes`);
      return nodes || [];
    } catch (error) {
      console.error(`[FileTree] fetchChildren("${dir}") error:`, error);
      return [];
    }
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
    const sshStore = useSSHStore.getState();
    const sshSession = sshStore.session;
    const workingDir = sshStore.workingDir;
    const isRemote = sshSession?.status === 'connected';

    set({ loading: true, expandedPaths: new Set(), selectedPath: null, isRemote, remoteRoot: workingDir });
    const nodes = await get().fetchChildren('');
    set({ nodes, loading: false });
  },

  createFile: async (filePath: string) => {
    try {
      const isRemote = get().isRemote;
      if (isRemote) {
        await api.sshWriteFile(filePath, '');
      } else {
        await api.createFile(filePath);
      }
      await get().refreshRoot();
      return true;
    } catch { return false; }
  },

  createDir: async (dirPath: string) => {
    try {
      // SSH 暂不支持创建目录
      if (!get().isRemote) {
        await api.createDir(dirPath);
        await get().refreshRoot();
      }
      return true;
    } catch { return false; }
  },

  renameNode: async (oldPath: string, newPath: string) => {
    try {
      // SSH 暂不支持重命名
      if (!get().isRemote) {
        await api.renameNode(oldPath, newPath);
        await get().refreshRoot();
      }
      return true;
    } catch { return false; }
  },

  deleteNode: async (nodePath: string) => {
    try {
      // SSH 暂不支持删除
      if (!get().isRemote) {
        await api.deleteNode(nodePath);
        await get().refreshRoot();
      }
      return true;
    } catch { return false; }
  },
}));
