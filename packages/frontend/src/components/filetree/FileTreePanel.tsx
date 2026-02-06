import { FolderTree } from 'lucide-react';

export default function FileTreePanel() {
  return (
    <div className="h-full bg-mantle flex flex-col">
      <div className="flex items-center gap-2 h-9 px-3 text-xs font-medium text-subtext0 uppercase tracking-wider border-b border-surface0">
        <FolderTree size={14} />
        <span>资源管理器</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-sm text-overlay0">
        文件树加载中...
      </div>
    </div>
  );
}
