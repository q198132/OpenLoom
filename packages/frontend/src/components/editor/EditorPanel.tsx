import { Code2 } from 'lucide-react';

export default function EditorPanel() {
  return (
    <div className="h-full bg-base flex flex-col">
      <div className="flex items-center h-9 px-3 bg-mantle border-b border-surface0">
        <span className="text-xs text-overlay0">暂无打开的文件</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-overlay0 gap-3">
        <Code2 size={48} strokeWidth={1} />
        <span className="text-sm">打开文件开始编辑</span>
      </div>
    </div>
  );
}
