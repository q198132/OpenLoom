import { create } from 'zustand';
import * as api from '@/lib/api';

interface AiSettingsState {
  baseUrl: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: { baseUrl: string; apiKey: string; model: string; customPrompt: string }) => Promise<void>;
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  customPrompt: '',
  loaded: false,

  fetchSettings: async () => {
    try {
      const data = await api.getAiSettings() as any;
      set({ baseUrl: data.baseUrl, apiKey: data.apiKey, model: data.model, customPrompt: data.customPrompt ?? '', loaded: true });
    } catch {
      // ignore
    }
  },

  saveSettings: async (settings) => {
    try {
      await api.saveAiSettings(settings);
      set({ baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model, customPrompt: settings.customPrompt });
    } catch {
      // ignore
    }
  },
}));
