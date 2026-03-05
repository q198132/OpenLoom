import { create } from 'zustand';
import * as api from '@/lib/api';

export type ShellType = 'powershell' | 'cmd';

export interface TerminalTab {
  id: number;
  name: string;
  connected: boolean;
  shellType: ShellType;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: number | null;
  nextIndex: number;
  defaultShellType: ShellType;
  setDefaultShellType: (shellType: ShellType) => void;
  createTerminal: (shellType?: ShellType) => Promise<number>;
  closeTerminal: (id: number) => Promise<void>;
  setActiveTab: (id: number) => void;
  setConnected: (id: number, v: boolean) => void;
  removeTab: (id: number) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  nextIndex: 1,
  defaultShellType: 'powershell',

  setDefaultShellType: (shellType: ShellType) => {
    set({ defaultShellType: shellType });
  },

  createTerminal: async (shellType?: ShellType) => {
    const index = get().nextIndex;
    const type = shellType ?? get().defaultShellType;
    const id = await api.ptySpawn(type);
    const tab: TerminalTab = { id, name: `终端 ${index} (${type === 'powershell' ? 'PS' : 'CMD'})`, connected: true, shellType: type };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
      nextIndex: s.nextIndex + 1,
    }));
    return id;
  },

  closeTerminal: async (id: number) => {
    await api.ptyKill(id).catch(() => {});
    const { tabs, activeTabId } = get();
    const remaining = tabs.filter((t) => t.id !== id);
    let newActive = activeTabId;
    if (activeTabId === id) {
      const idx = tabs.findIndex((t) => t.id === id);
      const next = remaining[Math.min(idx, remaining.length - 1)];
      newActive = next ? next.id : null;
    }
    set({ tabs: remaining, activeTabId: newActive });
  },

  setActiveTab: (id: number) => set({ activeTabId: id }),

  setConnected: (id: number, v: boolean) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, connected: v } : t)),
    })),

  removeTab: (id: number) => {
    const { tabs, activeTabId } = get();
    const remaining = tabs.filter((t) => t.id !== id);
    let newActive = activeTabId;
    if (activeTabId === id) {
      const idx = tabs.findIndex((t) => t.id === id);
      const next = remaining[Math.min(idx, remaining.length - 1)];
      newActive = next ? next.id : null;
    }
    set({ tabs: remaining, activeTabId: newActive });
  },
}));
