import { PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react';
import { useLayoutStore } from '@/stores/layoutStore';

export default function TopBar() {
  const { sidebarVisible, toggleSidebar, theme, setTheme } = useLayoutStore();

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
          ClaudeGui
        </span>
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
