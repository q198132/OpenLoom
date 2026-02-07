import { useState, useRef, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, FolderOpen, ChevronDown } from 'lucide-react';
import { useLayoutStore } from '@/stores/layoutStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function TopBar() {
  const { sidebarVisible, toggleSidebar, theme, setTheme } = useLayoutStore();
  const { projectName, currentPath, recentProjects, fetchWorkspace, fetchRecent, openFolder, setBrowserOpen } = useWorkspaceStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWorkspace();
    fetchRecent();
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div className="flex items-center justify-between h-10 px-3 bg-mantle border-b border-surface0 select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-surface0 text-subtext0 hover:text-text transition-colors"
          title={sidebarVisible ? '隐藏侧栏' : '显示侧栏'}
        >
          {sidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <span className="text-sm font-semibold text-accent tracking-wide">
          OpenLoom
        </span>

        {/* 项目选择器 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface0 text-subtext1 hover:text-text transition-colors text-sm"
          >
            <FolderOpen size={14} />
            <span className="max-w-[160px] truncate">{projectName || '...'}</span>
            <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-surface0 border border-surface1 rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { setDropdownOpen(false); setBrowserOpen(true); }}
                className="w-full text-left px-3 py-2 text-sm text-text hover:bg-surface1 transition-colors flex items-center gap-2"
              >
                <FolderOpen size={14} className="text-accent" />
                打开文件夹...
              </button>

              {recentProjects.length > 0 && (
                <>
                  <div className="border-t border-surface1 my-1" />
                  <div className="px-3 py-1 text-xs text-subtext0">最近打开</div>
                  {recentProjects.map((p) => {
                    const name = p.split(/[/\\]/).pop() || p;
                    const isCurrent = p === currentPath;
                    return (
                      <button
                        key={p}
                        onClick={() => { if (!isCurrent) openFolder(p); setDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm truncate transition-colors flex items-center gap-2 ${
                          isCurrent
                            ? 'text-accent bg-surface1/50 cursor-default'
                            : 'text-subtext1 hover:bg-surface1 hover:text-text'
                        }`}
                        title={p}
                      >
                        {name}
                        {isCurrent && <span className="text-xs text-subtext0 ml-auto shrink-0">当前</span>}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded hover:bg-surface0 text-subtext0 hover:text-text transition-colors"
          title="切换主题"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
}
