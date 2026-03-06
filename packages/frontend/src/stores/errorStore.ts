import { create } from 'zustand';

export interface AppErrorItem {
  id: number;
  title: string;
  message: string;
}

interface ErrorState {
  errors: AppErrorItem[];
  pushError: (title: string, message: string) => void;
  removeError: (id: number) => void;
  clearAll: () => void;
}

let nextErrorId = 1;

export const useErrorStore = create<ErrorState>((set) => ({
  errors: [],
  pushError: (title, message) => set((state) => ({
    errors: [...state.errors, { id: nextErrorId++, title, message }],
  })),
  removeError: (id) => set((state) => ({
    errors: state.errors.filter((item) => item.id !== id),
  })),
  clearAll: () => set({ errors: [] }),
}));

export function showError(title: string, error: unknown, fallback = '发生未知错误') {
  let message = fallback;
  if (typeof error === 'string' && error.trim()) {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = String((error as { message?: unknown }).message || '').trim();
    if (maybeMessage) message = maybeMessage;
  }
  useErrorStore.getState().pushError(title, message);
}
