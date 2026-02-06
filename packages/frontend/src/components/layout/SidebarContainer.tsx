import { FolderTree, GitBranch } from 'lucide-react';
import { useLayoutStore } from '@/stores/layoutStore';
import FileTreePanel from '../filetree/FileTreePanel';
import GitPanel from '../git/GitPanel';

export default function SidebarContainer() {
  const { sidebarTab, setSidebarTab } = useLayoutStore();

  return (
    <div className="h-full flex">
      {/* 图标栏 */}
      <div className="w-10 bg-crust flex flex-col items-center pt-2 gap-1 border-r border-surface0">
        <SidebarIcon
          active={sidebarTab === 'files'}
          onClick={() => setSidebarTab('files')}
          title="资源管理器"
        >
          <FolderTree size={18} />
        </SidebarIcon>
        <SidebarIcon
          active={sidebarTab === 'git'}
          onClick={() => setSidebarTab('git')}
          title="源代码管理"
        >
          <GitBranch size={18} />
        </SidebarIcon>
      </div>

      {/* 面板内容 */}
      <div className="flex-1 overflow-hidden">
        {sidebarTab === 'files' && <FileTreePanel />}
        {sidebarTab === 'git' && <GitPanel />}
      </div>
    </div>
  );
}
