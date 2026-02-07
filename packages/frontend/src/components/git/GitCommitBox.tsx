import { useState } from 'react';
import { useGitStore } from '@/stores/gitStore';

export default function GitCommitBox() {
  const { files, commitMessage, setCommitMessage, commit, stageAll } = useGitStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const hasStagedFiles = files.some((f) => f.staged);
  const hasUnstagedFiles = files.some((f) => !f.staged);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    if (!hasStagedFiles && hasUnstagedFiles) {
      setShowConfirm(true);
      return;
    }
    await commit();
  };

  const handleConfirmStageAndCommit = async () => {
    setShowConfirm(false);
    await stageAll();
    await commit();
  };

  return (
    <div className="px-3 py-2 border-b border-surface0">
      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="提交信息..."
        className="w-full h-16 px-2 py-1.5 text-xs bg-crust text-text border border-surface0 rounded resize-none focus:outline-none focus:border-accent placeholder:text-overlay0"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleCommit();
          }
        }}
      />
      <button
        onClick={handleCommit}
        disabled={!commitMessage.trim()}
        className="w-full mt-1.5 py-1 text-xs font-medium rounded bg-accent text-crust hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        提交 (Ctrl+Enter)
      </button>

      {showConfirm && (
        <div className="mt-2 p-2 bg-surface0 rounded border border-surface1 text-xs text-subtext1">
          <p>没有暂存的更改。是否暂存所有更改并提交？</p>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={handleConfirmStageAndCommit}
              className="flex-1 py-1 rounded bg-accent text-crust hover:bg-accent/80 font-medium transition-colors"
            >
              是
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-1 rounded bg-surface1 text-subtext1 hover:bg-surface2 transition-colors"
            >
              否
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
