import { DiffEditor } from '@monaco-editor/react';
import { useDiffReviewStore } from '@/stores/diffReviewStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { catppuccinMocha, catppuccinLatte } from '@/themes/catppuccin';
import { Check, X } from 'lucide-react';

export default function DiffReviewPanel() {
  const { pendingReviews, activeReviewPath, acceptReview, rejectReview } =
    useDiffReviewStore();
  const theme = useLayoutStore((s) => s.theme);

  const activeReview = pendingReviews.find(
    (r) => r.path === activeReviewPath,
  );

  if (!activeReview) return null;

  const name = activeReview.path.split('/').pop() || activeReview.path;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';

  // 简单的扩展名到语言映射
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    json: 'json', html: 'html', css: 'css',
    md: 'markdown', py: 'python',
  };
  const language = langMap[ext] || 'plaintext';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-9 px-3 bg-mantle border-b border-surface0">
        <span className="text-xs text-subtext0">
          变更对比: <span className="text-text">{activeReview.path}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => acceptReview(activeReview.path)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-green/15 text-green hover:bg-green/25 transition-colors"
          >
            <Check size={13} />
            接受
          </button>
          <button
            onClick={() => rejectReview(activeReview.path)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-red/15 text-red hover:bg-red/25 transition-colors"
          >
            <X size={13} />
            拒绝
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DiffEditor
          original={activeReview.oldContent}
          modified={activeReview.newContent}
          language={language}
          theme={theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte'}
          options={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            readOnly: true,
            renderSideBySide: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
          }}
        />
      </div>
    </div>
  );
}
