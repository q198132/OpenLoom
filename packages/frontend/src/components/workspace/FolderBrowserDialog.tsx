import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, FolderPlus, ArrowUp, X, Check, XCircle } from 'lucide-react';
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
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const browse = useCallback(async (dir: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.browseDirs(dir);
      setBrowseData(data);
      setInputPath(data.current);
    } catch (e: any) {
      setError(e.message || '无法浏览目录');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (browserOpen) {
      // 打开时自动浏览当前路径或用户主目录
      const initialPath = currentPath || (navigator.platform.includes('Win') ? 'C:\\' : '/');
      browse(initialPath);
    }
  }, [browserOpen, browse]);

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

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !browseData) return;
    const sep = browseData.current.includes('/') ? '/' : '\\';
    const newPath = browseData.current + sep + name;
    try {
      await api.createDir(newPath);
      setCreating(false);
      setNewFolderName('');
      await browse(browseData.current);
    } catch (e: any) {
      setError(e.message || '创建文件夹失败');
    }
  };

  const handleNewFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      setCreating(false);
      setNewFolderName('');
    }
  };

  if (!browserOpen) return null;

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="dialog-content bg-base/95 backdrop-blur-xl border border-surface0/60 rounded-xl shadow-2xl w-[520px] max-h-[480px] flex flex-col">
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
            className="w-full px-3 py-2 text-sm bg-surface0 border border-surface1 rounded-lg text-text placeholder:text-subtext0 focus:outline-none focus:border-accent input-glow transition-all duration-200"
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
              {/* 新建文件夹 - 内联输入 */}
              {creating && (
                <div className="flex items-center gap-1 px-3 py-1.5">
                  <FolderPlus size={14} className="text-green shrink-0" />
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={handleNewFolderKeyDown}
                    placeholder="文件夹名称..."
                    className="flex-1 px-2 py-0.5 text-sm bg-surface0 border border-surface1 rounded text-text placeholder:text-subtext0 focus:outline-none focus:border-accent"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="p-1 rounded hover:bg-surface0 text-green transition-colors"
                    title="确认"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewFolderName(''); }}
                    className="p-1 rounded hover:bg-surface0 text-subtext0 transition-colors"
                    title="取消"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              )}
              {browseData.dirs.map((d) => (
                <button
                  key={d.path}
                  onClick={() => browse(d.path)}
                  className="w-full text-left px-3 py-1.5 text-sm text-text hover:bg-surface0 rounded transition-colors flex items-center gap-2"
                >
                  <FolderOpen size={14} className="text-yellow" />
                  {d.name}
                </button>
              ))}
              {browseData.dirs.length === 0 && !creating && !error && (
                <div className="px-3 py-2 text-sm text-subtext0">无子目录</div>
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface0">
          <button
            onClick={() => { setCreating(true); setNewFolderName(''); }}
            disabled={!browseData || loading}
            className="px-3 py-1.5 text-sm rounded border border-surface1 text-subtext1 hover:bg-surface0 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <FolderPlus size={14} />
            新建文件夹
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBrowserOpen(false)}
              className="px-4 py-1.5 text-sm rounded border border-surface1 text-subtext1 hover:bg-surface0 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleOpen}
              className="px-4 py-1.5 text-sm rounded-lg bg-accent text-base font-medium hover:opacity-90 transition-all duration-200 active:scale-[0.97] shadow-[0_0_12px_var(--color-accent)/20]"
            >
              打开
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
