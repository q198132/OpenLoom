import { create } from 'zustand';

type SidebarTab = 'files' | 'git' | 'search';

interface LayoutState {
  sidebarVisible: boolean;
  sidebarTab: SidebarTab;
  theme: 'dark' | 'light';
  quickOpenVisible: boolean;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleQuickOpen: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarVisible: true,
  sidebarTab: 'files',
  theme: 'dark',
  quickOpenVisible: false,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setTheme: (theme) => set({ theme }),
  toggleQuickOpen: () => set((s) => ({ quickOpenVisible: !s.quickOpenVisible })),
}));
