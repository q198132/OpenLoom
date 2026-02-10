import { FolderTree, GitBranch, Search } from 'lucide-react';
import { useLayoutStore } from '@/stores/layoutStore';
import { useGitStore } from '@/stores/gitStore';
import FileTreePanel from '../filetree/FileTreePanel';
import GitPanel from '../git/GitPanel';
import SearchPanel from '../search/SearchPanel';

function SidebarIcon({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded transition-colors ${
        active
          ? 'text-accent bg-surface0'
          : 'text-overlay0 hover:text-text hover:bg-surface0/50'
      }`}
    >
      {children}
    </button>
  );
}

export default function SidebarContainer() {
  const { sidebarTab, setSidebarTab } = useLayoutStore();
  const gitFiles = useGitStore((s) => s.files);
  const changeCount = gitFiles.length;

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
          <div className="relative">
            <GitBranch size={18} />
            {changeCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-accent text-crust text-[10px] font-bold leading-none px-0.5">
                {changeCount > 99 ? '99+' : changeCount}
              </span>
            )}
          </div>
        </SidebarIcon>
        <SidebarIcon
          active={sidebarTab === 'search'}
          onClick={() => setSidebarTab('search')}
          title="搜索"
        >
          <Search size={18} />
        </SidebarIcon>
      </div>

      {/* 面板内容 */}
      <div className="flex-1 overflow-hidden">
        {sidebarTab === 'files' && <FileTreePanel />}
        {sidebarTab === 'git' && <GitPanel />}
        {sidebarTab === 'search' && <SearchPanel />}
      </div>
    </div>
  );
}
