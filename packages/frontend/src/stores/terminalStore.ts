import { create } from 'zustand';

interface TerminalState {
  connected: boolean;
  setConnected: (v: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
