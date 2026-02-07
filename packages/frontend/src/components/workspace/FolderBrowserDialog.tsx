import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, ArrowUp, X } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import * as api from '@/lib/api';

interface DirEntry {
  name: string;
  path: string;
}

interface BrowseResult {
  current: string;
  parent: string;
  dirs: DirEntry[];
}

export default function FolderBrowserDialog() {
  const { browserOpen, setBrowserOpen, openFolder, currentPath } = useWorkspaceStore();
  const [inputPath, setInputPath] = useState('');
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const browse = useCallback(async (dir: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.browseDirs(dir);
      if (data.error) {
        setError(data.error);
      } else {
        setBrowseData(data);
        setInputPath(data.current);
      }
    } catch {
      setError('无法浏览目录');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (browserOpen) {
      browse(currentPath || '');
    }
  }, [browserOpen, currentPath, browse]);

  const handleOpen = () => {
    if (inputPath.trim()) {
      openFolder(inputPath.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // 回车导航到输入的路径，而非直接打开工作区
      if (inputPath.trim()) browse(inputPath.trim());
    } else if (e.key === 'Escape') {
      setBrowserOpen(false);
    }
  };

  if (!browserOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base border border-surface0 rounded-lg shadow-xl w-[520px] max-h-[480px] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface0">
          <span className="text-sm font-semibold text-text">打开文件夹</span>
          <button
            onClick={() => setBrowserOpen(false)}
            className="p-1 rounded hover:bg-surface0 text-subtext0 hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 路径输入框 */}
        <div className="px-4 py-3 border-b border-surface0">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入目录路径..."
            className="w-full px-3 py-2 text-sm bg-surface0 border border-surface1 rounded text-text placeholder:text-subtext0 focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        {/* 目录列表 */}
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[200px]">
          {error && (
            <div className="px-3 py-2 text-sm text-red">{error}</div>
          )}
          {loading && (
            <div className="px-3 py-2 text-sm text-subtext0">加载中...</div>
          )}
          {browseData && !loading && (
            <>
              {/* 返回上级 */}
              {browseData.parent !== browseData.current && (
                <button
                  onClick={() => browse(browseData.parent)}
                  className="w-full text-left px-3 py-1.5 text-sm text-subtext1 hover:bg-surface0 rounded transition-colors flex items-center gap-2"
                >
                  <ArrowUp size={14} className="text-subtext0" />
                  ..
                </button>
              )}
              {browseData.dirs.map((d) => (
                <button
                  key={d.path}
                  onDoubleClick={() => browse(d.path)}
                  onClick={() => setInputPath(d.path)}
                  className="w-full text-left px-3 py-1.5 text-sm text-text hover:bg-surface0 rounded transition-colors flex items-center gap-2"
                >
                  <FolderOpen size={14} className="text-yellow" />
                  {d.name}
                </button>
              ))}
              {browseData.dirs.length === 0 && !error && (
                <div className="px-3 py-2 text-sm text-subtext0">无子目录</div>
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface0">
          <button
            onClick={() => setBrowserOpen(false)}
            className="px-4 py-1.5 text-sm rounded border border-surface1 text-subtext1 hover:bg-surface0 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleOpen}
            className="px-4 py-1.5 text-sm rounded bg-accent text-base font-medium hover:opacity-90 transition-opacity"
          >
            打开
          </button>
        </div>
      </div>
    </div>
  );
}
