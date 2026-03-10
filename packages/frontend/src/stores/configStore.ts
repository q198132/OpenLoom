import { create } from 'zustand';
import * as api from '@/lib/api';
import type { Shortcuts, AiConfig } from '@/lib/api';
import { showError } from './errorStore';

export type { Shortcuts, AiConfig };

export const TERMINAL_FONT_SIZE_MIN = 10;
export const TERMINAL_FONT_SIZE_MAX = 24;
export const DEFAULT_TERMINAL_FONT_SIZE = 15;
export const EDITOR_FONT_SIZE_MIN = 10;
export const EDITOR_FONT_SIZE_MAX = 24;
export const DEFAULT_EDITOR_FONT_SIZE = 14;

export function clampFontSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampTerminalFontSize(value: number): number {
  return clampFontSize(value, TERMINAL_FONT_SIZE_MIN, TERMINAL_FONT_SIZE_MAX);
}

export function clampEditorFontSize(value: number): number {
  return clampFontSize(value, EDITOR_FONT_SIZE_MIN, EDITOR_FONT_SIZE_MAX);
}

export interface AppConfig {
  terminalFontSize: number;
  editorFontSize: number;
  shortcuts: Shortcuts;
  ai: AiConfig;
}

interface ConfigState {
  config: AppConfig;
  loading: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  setConfig: (updates: Partial<AppConfig>) => void;
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
  terminalFontSize: DEFAULT_TERMINAL_FONT_SIZE,
  editorFontSize: DEFAULT_EDITOR_FONT_SIZE,
  shortcuts: DEFAULT_SHORTCUTS,
  ai: DEFAULT_AI,
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  loading: false,

  setConfig: (updates: Partial<AppConfig>) => {
    set((state) => ({
      config: {
        ...state.config,
        ...updates,
        terminalFontSize: updates.terminalFontSize === undefined
          ? state.config.terminalFontSize
          : clampTerminalFontSize(updates.terminalFontSize),
        editorFontSize: updates.editorFontSize === undefined
          ? state.config.editorFontSize
          : clampEditorFontSize(updates.editorFontSize),
      },
    }));
  },

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
      showError('加载设置失败', error, '加载设置失败，已回退默认配置');
      set({ config: DEFAULT_CONFIG, loading: false });
    }
  },

  updateConfig: async (updates: Partial<AppConfig>) => {
    const current = get().config;
    const updated = {
      ...current,
      ...updates,
      terminalFontSize: updates.terminalFontSize === undefined
        ? current.terminalFontSize
        : clampTerminalFontSize(updates.terminalFontSize),
      editorFontSize: updates.editorFontSize === undefined
        ? current.editorFontSize
        : clampEditorFontSize(updates.editorFontSize),
      shortcuts: updates.shortcuts ? { ...current.shortcuts, ...updates.shortcuts } : current.shortcuts,
      ai: updates.ai ? { ...current.ai, ...updates.ai } : current.ai,
    };
    try {
      await api.saveConfig(updated);
      set({ config: updated });
    } catch (error) {
      console.error('Failed to save config:', error);
      showError('保存设置失败', error, '保存设置失败');
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
