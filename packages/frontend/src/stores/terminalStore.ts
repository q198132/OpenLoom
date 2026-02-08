import { create } from 'zustand';
import * as api from '@/lib/api';

export interface TerminalTab {
  id: number;
  name: string;
  connected: boolean;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: number | null;
  nextIndex: number;
  createTerminal: () => Promise<number>;
  closeTerminal: (id: number) => Promise<void>;
  setActiveTab: (id: number) => void;
  setConnected: (id: number, v: boolean) => void;
  removeTab: (id: number) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  nextIndex: 1,

  createTerminal: async () => {
    const index = get().nextIndex;
    const id = await api.ptySpawn();
    const tab: TerminalTab = { id, name: `终端 ${index}`, connected: true };
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
