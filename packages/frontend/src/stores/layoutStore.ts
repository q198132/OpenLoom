import { create } from 'zustand';

interface LayoutState {
  sidebarVisible: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarVisible: true,
  theme: 'dark',
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setTheme: (theme) => set({ theme }),
}));
