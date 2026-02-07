import { useEffect, useRef } from 'react';
import { FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  isDirectory: boolean;
  isBlank: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors ${
        danger
          ? 'text-red hover:bg-red/10'
          : 'text-text hover:bg-surface0'
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

export default function ContextMenu({
  x, y, isDirectory, isBlank, onNewFile, onNewFolder, onRename, onDelete, onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // 防止菜单超出视口
  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 50,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="bg-base border border-surface0 rounded-md shadow-lg py-1 min-w-[160px]"
    >
      {(isDirectory || isBlank) && (
        <>
          <MenuItem icon={<FilePlus size={14} />} label="新建文件" onClick={onNewFile} />
          <MenuItem icon={<FolderPlus size={14} />} label="新建文件夹" onClick={onNewFolder} />
        </>
      )}
      {!isBlank && (
        <>
          {(isDirectory) && <div className="border-t border-surface0 my-1" />}
          <MenuItem icon={<Pencil size={14} />} label="重命名" onClick={onRename} />
          <MenuItem icon={<Trash2 size={14} />} label="删除" onClick={onDelete} danger />
        </>
      )}
    </div>
  );
}
