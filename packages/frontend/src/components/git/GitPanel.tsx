import { useEffect, useState, useCallback } from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import GitFileList from './GitFileList';
import GitCommitBox from './GitCommitBox';
import GitActions from './GitActions';
import GitGraph from './GitGraph';

export default function GitPanel() {
  const { branch, fetchStatus, fetchBranch, fetchLog } = useGitStore();
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
          onClick={() => { fetchStatus(); fetchBranch(); }}
          className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
          title="刷新"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {branch && (
        <div className="px-3 py-1.5 text-xs text-subtext0 border-b border-surface0">
          分支: <span className="text-accent">{branch.current}</span>
        </div>
      )}

      <GitCommitBox />
      <GitFileList />
      <GitActions />
      <GitGraph />
    </div>
  );
}
