import { useGitStore } from '@/stores/gitStore';

export default function GitCommitBox() {
  const { commitMessage, setCommitMessage, commit } = useGitStore();

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
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
    </div>
  );
}
