import { useState } from 'react';
import { X, Plus, TerminalSquare, Circle, ChevronDown } from 'lucide-react';
import { useTerminalStore, type ShellType } from '@/stores/terminalStore';

export default function TerminalTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTerminal, createTerminal, defaultShellType, setDefaultShellType } =
    useTerminalStore();

  const [showShellMenu, setShowShellMenu] = useState(false);

  const handleCreateTerminal = (shellType: ShellType) => {
    createTerminal(shellType);
    setShowShellMenu(false);
  };

  return (
    <div className="flex items-center h-8 bg-mantle border-b border-surface0 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group flex items-center gap-1.5 h-full px-3 cursor-pointer border-r border-surface0/50 text-xs select-none transition-all duration-200 ${
            activeTabId === tab.id
              ? 'bg-base text-text border-b-2 border-b-accent shadow-[inset_0_-1px_0_var(--color-accent)]'
              : 'text-overlay1 hover:bg-surface0/60 hover:text-subtext1'
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          <TerminalSquare size={12} className="text-subtext0 shrink-0" />
          <span className="truncate max-w-[100px]">{tab.name}</span>
          <Circle
            size={6}
            className={`shrink-0 ${
              tab.connected ? 'fill-green text-green' : 'fill-red text-red'
            }`}
          />
          <button
            className="p-0.5 rounded hover:bg-surface1 text-overlay0 hover:text-text opacity-0 group-hover:opacity-100 transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              closeTerminal(tab.id);
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="relative">
        <button
          className="flex items-center justify-center h-full px-2 text-overlay1 hover:text-text hover:bg-surface0 transition-colors gap-1"
          onClick={() => setShowShellMenu(!showShellMenu)}
          title="新建终端（选择 Shell 类型）"
        >
          <Plus size={14} />
          <ChevronDown size={12} />
        </button>
        {showShellMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowShellMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 bg-surface0/90 backdrop-blur-sm rounded-lg shadow-lg border border-surface1 z-20 min-w-[140px] overflow-hidden">
              <div className="px-2 py-1.5 text-xs text-overlay0 border-b border-surface1/50">
                选择 Shell 类型
              </div>
              <button
                className={`w-full px-3 py-2 text-left text-xs hover:bg-surface1 transition-colors flex items-center gap-2 ${
                  defaultShellType === 'powershell' ? 'bg-surface1/50 text-text' : 'text-overlay1'
                }`}
                onClick={() => {
                  setDefaultShellType('powershell');
                  handleCreateTerminal('powershell');
                }}
              >
                <TerminalSquare size={12} />
                PowerShell
                {defaultShellType === 'powershell' && (
                  <Circle size={8} className="ml-auto fill-accent text-accent" />
                )}
              </button>
              <button
                className={`w-full px-3 py-2 text-left text-xs hover:bg-surface1 transition-colors flex items-center gap-2 ${
                  defaultShellType === 'cmd' ? 'bg-surface1/50 text-text' : 'text-overlay1'
                }`}
                onClick={() => {
                  setDefaultShellType('cmd');
                  handleCreateTerminal('cmd');
                }}
              >
                <TerminalSquare size={12} />
                CMD
                {defaultShellType === 'cmd' && (
                  <Circle size={8} className="ml-auto fill-accent text-accent" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
