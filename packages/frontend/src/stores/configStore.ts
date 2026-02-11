import { create } from 'zustand';
import * as api from '@/lib/api';
import type { Shortcuts, AiConfig } from '@/lib/api';

export type { Shortcuts, AiConfig };

export interface AppConfig {
  terminalFontSize: number;
  shortcuts: Shortcuts;
  ai: AiConfig;
}

interface ConfigState {
  config: AppConfig;
  loading: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
}

const DEFAULT_SHORTCUTS: Shortcuts = {
  saveFile: 'Ctrl+S',
  quickOpen: 'Ctrl+P',
  globalSearch: 'Ctrl+Shift+F',
  toggleSidebar: 'Ctrl+B',
  gitCommit: 'Ctrl+Enter',
};

const DEFAULT_AI: AiConfig = {
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  customPrompt: '',
};

const DEFAULT_CONFIG: AppConfig = {
  terminalFontSize: 15,
  shortcuts: DEFAULT_SHORTCUTS,
  ai: DEFAULT_AI,
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  loading: false,

  loadConfig: async () => {
    set({ loading: true });
    try {
      const config = await api.getConfig() as any;
      set({
        config: {
          ...DEFAULT_CONFIG,
          ...config,
          shortcuts: { ...DEFAULT_SHORTCUTS, ...config.shortcuts },
          ai: { ...DEFAULT_AI, ...config.ai },
        },
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ config: DEFAULT_CONFIG, loading: false });
    }
  },

  updateConfig: async (updates: Partial<AppConfig>) => {
    const current = get().config;
    const updated = {
      ...current,
      ...updates,
      shortcuts: updates.shortcuts ? { ...current.shortcuts, ...updates.shortcuts } : current.shortcuts,
      ai: updates.ai ? { ...current.ai, ...updates.ai } : current.ai,
    };
    try {
      await api.saveConfig(updated);
      set({ config: updated });
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  },
}));

/**
 * 解析快捷键字符串（如 "Ctrl+Shift+F"）并匹配 KeyboardEvent
 */
export function matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+').map((s) => s.trim().toLowerCase());
  const needCtrl = parts.includes('ctrl');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt');
  const key = parts.filter((p) => p !== 'ctrl' && p !== 'shift' && p !== 'alt')[0] || '';

  if ((e.ctrlKey || e.metaKey) !== needCtrl) return false;
  if (e.shiftKey !== needShift) return false;
  if (e.altKey !== needAlt) return false;

  return e.key.toLowerCase() === key;
}
