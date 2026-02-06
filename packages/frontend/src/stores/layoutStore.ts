import { create } from 'zustand';

type SidebarTab = 'files' | 'git';

interface LayoutState {
  sidebarVisible: boolean;
  sidebarTab: SidebarTab;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarVisible: true,
  theme: 'dark',
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setTheme: (theme) => set({ theme }),
}));
