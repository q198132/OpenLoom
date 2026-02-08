import { useEffect, useState, useCallback } from 'react';
import { GitBranch, RefreshCw, X } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import GitFileList from './GitFileList';
import GitCommitBox from './GitCommitBox';
import GitActions from './GitActions';
import GitGraph from './GitGraph';

export default function GitPanel() {
  const { branch, error, clearError, fetchStatus, fetchBranch, fetchLog } = useGitStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchBranch();
    fetchLog();
  }, [fetchStatus, fetchBranch, fetchLog]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStatus(), fetchBranch(), fetchLog()]);
    setRefreshing(false);
  }, [fetchStatus, fetchBranch, fetchLog]);

  return (
    <div className="h-full bg-mantle flex flex-col">
      <div className="flex items-center justify-between h-9 px-3 border-b border-surface0">
        <div className="flex items-center gap-2 text-xs font-medium text-subtext0 uppercase tracking-wider">
          <GitBranch size={14} />
          <span>源代码管理</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
          title="刷新"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {branch && (
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-subtext0 border-b border-surface0">
          <span>分支: <span className="text-accent">{branch.current}</span></span>
          <GitActions />
        </div>
      )}

      <GitCommitBox />

      {error && (
        <div className="flex items-start gap-1.5 px-3 py-1.5 bg-red/10 border-b border-red/20 text-xs text-red">
          <span className="flex-1 break-all">{error}</span>
          <button onClick={clearError} className="shrink-0 p-0.5 hover:bg-red/20 rounded">
            <X size={12} />
          </button>
        </div>
      )}

      <GitFileList />
      <GitGraph />
    </div>
  );
}
