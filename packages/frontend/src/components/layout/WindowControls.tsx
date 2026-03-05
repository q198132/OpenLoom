import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function WindowControls() {
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error('Failed to minimize:', e);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.error('Failed to toggle maximize:', e);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close:', e);
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
