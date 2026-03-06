import { AlertTriangle, X } from 'lucide-react';
import { useErrorStore } from '@/stores/errorStore';

export default function ErrorDialogHost() {
  const { errors, removeError, clearAll } = useErrorStore();

  if (errors.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-start justify-end p-4">
      <div className="w-full max-w-md space-y-3 pointer-events-auto">
        {errors.length > 1 && (
          <div className="flex justify-end">
            <button
              onClick={clearAll}
              className="px-3 py-1 text-xs rounded-lg bg-surface0/95 text-subtext1 hover:bg-surface1 border border-surface1"
            >
              清空全部错误
            </button>
          </div>
        )}
        {errors.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-red/30 bg-base/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <AlertTriangle size={18} className="text-red shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-red">{item.title}</div>
                <div className="mt-1 text-xs text-subtext1 whitespace-pre-wrap break-words">{item.message}</div>
              </div>
              <button
                onClick={() => removeError(item.id)}
                className="p-1 rounded hover:bg-red/10 text-overlay0 hover:text-text"
                title="关闭"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
