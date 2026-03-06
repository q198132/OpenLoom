import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { showError } from '@/stores/errorStore';

export default function WindowControls() {
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error('Failed to minimize:', e);
      showError('窗口操作失败', e, '最小化失败');
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.error('Failed to toggle maximize:', e);
      showError('窗口操作失败', e, '切换最大化失败');
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close:', e);
      showError('窗口操作失败', e, '关闭窗口失败');
    }
  };

  return (
    <div className="flex items-center">
      <button
        onClick={handleMinimize}
        className="p-1.5 hover:bg-surface0 text-subtext0 hover:text-text transition-colors"
        title="最小化"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={handleToggleMaximize}
        className="p-1.5 hover:bg-surface0 text-subtext0 hover:text-text transition-colors"
        title="最大化"
      >
        <Square size={14} />
      </button>
      <button
        onClick={handleClose}
        className="p-1.5 hover:bg-red text-subtext0 hover:text-white transition-colors"
        title="关闭"
      >
        <X size={16} />
      </button>
    </div>
  );
}
