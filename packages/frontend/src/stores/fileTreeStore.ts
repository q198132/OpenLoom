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
  error: string | null;
  fetchChildren: (dir?: string) => Promise<FileNode[]>;
  toggleExpand: (path: string) => void;
  collapseAll: () => void;
  setSelected: (path: string | null) => void;
  refreshRoot: () => Promise<void>;
  createFile: (filePath: string) => Promise<boolean>;
  createDir: (dirPath: string) => Promise<boolean>;
  renameNode: (oldPath: string, newPath: string) => Promise<boolean>;
  deleteNode: (nodePath: string) => Promise<boolean>;
  clearError: () => void;
}

export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  nodes: [],
  expandedPaths: new Set(),
  selectedPath: null,
  loading: false,
  isRemote: false,
  remoteRoot: null,
  error: null,

  clearError: () => set({ error: null }),

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
    } catch (error: any) {
      console.error(`[FileTree] fetchChildren("${dir}") error:`, error);
      set({ error: error.message || '获取文件列表失败' });
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

    set({ loading: true, expandedPaths: new Set(), selectedPath: null, isRemote, remoteRoot: workingDir, error: null });
    const nodes = await get().fetchChildren('');
    set({ nodes, loading: false });
  },

  createFile: async (filePath: string) => {
    try {
      const isRemote = get().isRemote;
      set({ error: null });

      if (isRemote) {
        await api.sshWriteFile(filePath, '');
      } else {
        await api.createFile(filePath);
      }
      await get().refreshRoot();
      return true;
    } catch (e: any) {
      set({ error: e.message || '创建文件失败' });
      return false;
    }
  },

  createDir: async (dirPath: string) => {
    try {
      const isRemote = get().isRemote;
      set({ error: null });

      if (isRemote) {
        await api.sshCreateDir(dirPath);
      } else {
        await api.createDir(dirPath);
      }
      await get().refreshRoot();
      return true;
    } catch (e: any) {
      set({ error: e.message || '创建目录失败' });
      return false;
    }
  },

  renameNode: async (oldPath: string, newPath: string) => {
    try {
      const isRemote = get().isRemote;
      set({ error: null });

      if (isRemote) {
        await api.sshRename(oldPath, newPath);
      } else {
        await api.renameNode(oldPath, newPath);
      }
      await get().refreshRoot();
      return true;
    } catch (e: any) {
      set({ error: e.message || '重命名失败' });
      return false;
    }
  },

  deleteNode: async (nodePath: string) => {
    try {
      const isRemote = get().isRemote;
      const state = get();
      set({ error: null });

      // 查找节点以判断是文件还是目录
      const findNode = (nodes: FileNode[], path: string): FileNode | null => {
        for (const node of nodes) {
          if (node.path === path) return node;
          if (node.children) {
            const found = findNode(node.children, path);
            if (found) return found;
          }
        }
        return null;
      };

      const node = findNode(state.nodes, nodePath);
      const isDirectory = node?.isDirectory ?? false;

      if (isRemote) {
        if (isDirectory) {
          await api.sshDeleteDir(nodePath);
        } else {
          await api.sshDeleteFile(nodePath);
        }
      } else {
        await api.deleteNode(nodePath);
      }
      await get().refreshRoot();
      return true;
    } catch (e: any) {
      set({ error: e.message || '删除失败' });
      return false;
    }
  },
}));
