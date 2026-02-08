import { useEffect } from 'react';
import { TerminalSquare } from 'lucide-react';
import { useTerminalStore } from '@/stores/terminalStore';
import TerminalTabBar from './TerminalTabBar';
import TerminalInstance from './TerminalInstance';

export default function TerminalPanel() {
  const { tabs, activeTabId, createTerminal } = useTerminalStore();

  // 首次挂载自动创建一个终端
  useEffect(() => {
    if (tabs.length === 0) {
      createTerminal();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full bg-crust flex flex-col">
      <TerminalTabBar />
      {tabs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-overlay0 text-sm gap-2">
          <TerminalSquare size={16} />
          <span>无终端实例</span>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {tabs.map((tab) => (
            <TerminalInstance
              key={tab.id}
              id={tab.id}
              visible={tab.id === activeTabId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
