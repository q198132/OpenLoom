import { create } from 'zustand';

interface AiSettingsState {
  baseUrl: string;
  apiKey: string;
  model: string;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: { baseUrl: string; apiKey: string; model: string }) => Promise<void>;
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  loaded: false,

  fetchSettings: async () => {
    try {
      const res = await fetch('/api/ai/settings');
      if (!res.ok) return;
      const data = await res.json();
      set({ baseUrl: data.baseUrl, apiKey: data.apiKey, model: data.model, loaded: true });
    } catch {
      // ignore
    }
  },

  saveSettings: async (settings) => {
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        set({ baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model });
      }
    } catch {
      // ignore
    }
  },
}));
