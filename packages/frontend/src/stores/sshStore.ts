import { create } from 'zustand';
import type { SSHConnection, SSHSession } from '@openloom/shared';
import * as api from '@/lib/api';
import { useFileTreeStore } from './fileTreeStore';

interface SSHState {
  connections: SSHConnection[];
  session: SSHSession | null;
  workingDir: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConnections: () => Promise<void>;
  addConnection: (conn: Omit<SSHConnection, 'id' | 'source'>) => Promise<SSHConnection>;
  updateConnection: (id: string, updates: Partial<SSHConnection>) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  connect: (id: string) => Promise<void>;
  connectWithPassword: (id: string, password: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setWorkingDir: (dir: string) => Promise<void>;
  clearError: () => void;
}

export const useSSHStore = create<SSHState>((set, get) => ({
  connections: [],
  session: null,
  workingDir: null,
  isLoading: false,
  error: null,

  loadConnections: async () => {
    try {
      set({ isLoading: true, error: null });
      const connections = await api.sshGetConnections();
      set({ connections, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addConnection: async (conn) => {
    try {
      set({ isLoading: true, error: null });
      const newConn = await api.sshAddConnection(conn);
      const connections = [...get().connections, newConn];
      set({ connections, isLoading: false });
      return newConn;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateConnection: async (id, updates) => {
    try {
      set({ isLoading: true, error: null });
      const updated = await api.sshUpdateConnection(id, updates);
      const connections = get().connections.map((c) =>
        c.id === id ? updated : c
      );
      set({ connections, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeConnection: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await api.sshDeleteConnection(id);
      const connections = get().connections.filter((c) => c.id !== id);
      set({ connections, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  connect: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const session = await api.sshConnect(id);
      // 获取工作目录
      const workingDir = await api.sshGetWorkingDir();
      set({ session, workingDir, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false, session: null, workingDir: null });
      throw error;
    }
  },

  connectWithPassword: async (id, password) => {
    try {
      set({ isLoading: true, error: null });
      const session = await api.sshConnectWithPassword(id, password);
      const workingDir = await api.sshGetWorkingDir();
      set({ session, workingDir, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false, session: null, workingDir: null });
      throw error;
    }
  },

  disconnect: async () => {
    try {
      await api.sshDisconnect();
      set({ session: null, workingDir: null });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  refreshSession: async () => {
    try {
      const session = await api.sshGetSession();
      const workingDir = await api.sshGetWorkingDir();
      set({ session, workingDir });
    } catch (error: any) {
      set({ session: null, workingDir: null });
    }
  },

  setWorkingDir: async (dir: string) => {
    try {
      await api.sshSetWorkingDir(dir);
      set({ workingDir: dir });
      // 刷新文件树
      useFileTreeStore.getState().refreshRoot();
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  clearError: () => set({ error: null }),
}));
