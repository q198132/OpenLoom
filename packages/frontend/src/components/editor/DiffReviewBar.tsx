import { Check, X, CheckCheck, XCircle } from 'lucide-react';
import { useDiffReviewStore } from '@/stores/diffReviewStore';

export default function DiffReviewBar() {
  const {
    pendingReviews,
    activeReviewPath,
    setActiveReview,
    acceptReview,
    rejectReview,
    acceptAll,
    rejectAll,
  } = useDiffReviewStore();

  if (pendingReviews.length === 0) return null;

  return (
    <div className="bg-mantle border-b border-surface0 px-3 py-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-yellow">
          {pendingReviews.length} 个文件待审核
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={acceptAll}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-green/15 text-green hover:bg-green/25 transition-colors"
          >
            <CheckCheck size={13} />
            全部接受
          </button>
          <button
            onClick={rejectAll}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-red/15 text-red hover:bg-red/25 transition-colors"
          >
            <XCircle size={13} />
            全部拒绝
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {pendingReviews.map((r) => {
          const name = r.path.split('/').pop() || r.path;
          const isActive = activeReviewPath === r.path;
          return (
            <div
              key={r.path}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-surface0 text-text'
                  : 'text-overlay1 hover:bg-surface0/50'
              }`}
              onClick={() => setActiveReview(r.path)}
            >
              <span className="truncate max-w-[100px]">{name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  acceptReview(r.path);
                }}
                className="p-0.5 rounded hover:bg-green/20 text-green"
                title="接受"
              >
                <Check size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rejectReview(r.path);
                }}
                className="p-0.5 rounded hover:bg-red/20 text-red"
                title="拒绝"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
