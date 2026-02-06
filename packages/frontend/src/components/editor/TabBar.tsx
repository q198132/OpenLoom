import { X } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

export default function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab } = useEditorStore();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center h-9 bg-mantle border-b border-surface0 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.path}
          className={`flex items-center gap-1.5 h-full px-3 cursor-pointer border-r border-surface0 text-xs select-none transition-colors ${
            activeTab === tab.path
              ? 'bg-base text-text border-b-2 border-b-accent'
              : 'text-overlay1 hover:bg-surface0'
          }`}
          onClick={() => setActiveTab(tab.path)}
        >
          <span className="truncate max-w-[120px]">
            {tab.isDirty && <span className="text-accent mr-0.5">*</span>}
            {tab.name}
          </span>
          <button
            className="p-0.5 rounded hover:bg-surface1 text-overlay0 hover:text-text"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.path);
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
