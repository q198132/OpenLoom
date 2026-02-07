import { create } from 'zustand';
import type { DiffReviewItem } from '@openloom/shared';
import * as api from '@/lib/api';

interface DiffReviewState {
  pendingReviews: DiffReviewItem[];
  activeReviewPath: string | null;
  addReview: (item: DiffReviewItem) => void;
  acceptReview: (path: string) => void;
  rejectReview: (path: string) => Promise<void>;
  acceptAll: () => void;
  rejectAll: () => Promise<void>;
  setActiveReview: (path: string | null) => void;
  hasPending: () => boolean;
}

export const useDiffReviewStore = create<DiffReviewState>((set, get) => ({
  pendingReviews: [],
  activeReviewPath: null,

  addReview: (item) => {
    set((s) => {
      // 如果同一文件已有待审核，替换为最新的
      const filtered = s.pendingReviews.filter((r) => r.path !== item.path);
      const next = [...filtered, item];
      const activeReviewPath = s.activeReviewPath ?? item.path;
      return { pendingReviews: next, activeReviewPath };
    });
  },

  acceptReview: (path) => {
    set((s) => {
      const remaining = s.pendingReviews.filter((r) => r.path !== path);
      const activeReviewPath =
        s.activeReviewPath === path
          ? remaining[0]?.path ?? null
          : s.activeReviewPath;
      return { pendingReviews: remaining, activeReviewPath };
    });
  },

  rejectReview: async (path) => {
    const review = get().pendingReviews.find((r) => r.path === path);
    if (!review) return;

    // 写回旧内容
    await api.writeFile(path, review.oldContent);

    set((s) => {
      const remaining = s.pendingReviews.filter((r) => r.path !== path);
      const activeReviewPath =
        s.activeReviewPath === path
          ? remaining[0]?.path ?? null
          : s.activeReviewPath;
      return { pendingReviews: remaining, activeReviewPath };
    });
  },

  acceptAll: () => {
    set({ pendingReviews: [], activeReviewPath: null });
  },

  rejectAll: async () => {
    const reviews = get().pendingReviews;
    await Promise.all(
      reviews.map((r) => api.writeFile(r.path, r.oldContent)),
    );
    set({ pendingReviews: [], activeReviewPath: null });
  },

  setActiveReview: (path) => set({ activeReviewPath: path }),

  hasPending: () => get().pendingReviews.length > 0,
}));
