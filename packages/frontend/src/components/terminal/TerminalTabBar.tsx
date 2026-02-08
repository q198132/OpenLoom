import { X, Plus, TerminalSquare, Circle } from 'lucide-react';
import { useTerminalStore } from '@/stores/terminalStore';

export default function TerminalTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTerminal, createTerminal } =
    useTerminalStore();

  return (
    <div className="flex items-center h-8 bg-mantle border-b border-surface0 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center gap-1.5 h-full px-3 cursor-pointer border-r border-surface0 text-xs select-none transition-colors ${
            activeTabId === tab.id
              ? 'bg-base text-text border-b-2 border-b-accent'
              : 'text-overlay1 hover:bg-surface0'
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
            className="p-0.5 rounded hover:bg-surface1 text-overlay0 hover:text-text"
            onClick={(e) => {
              e.stopPropagation();
              closeTerminal(tab.id);
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        className="flex items-center justify-center h-full px-2 text-overlay1 hover:text-text hover:bg-surface0 transition-colors"
        onClick={() => createTerminal()}
        title="新建终端"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
