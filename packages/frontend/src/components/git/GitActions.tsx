import { useState } from 'react';
import { ArrowUp, ArrowDown, Loader2, RotateCcw } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import { showError } from '@/stores/errorStore';

export default function GitActions() {
  const { push, pull, discardAll, files } = useGitStore();
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const handlePull = async () => {
    setPulling(true);
    await pull();
    setPulling(false);
  };

  const handlePush = async () => {
    setPushing(true);
    await push();
    setPushing(false);
  };

  const handleDiscardAll = async () => {
    if (files.length === 0) return;
    if (!confirm('确定放弃全部更改吗？这会恢复已跟踪文件并删除未跟踪文件/目录。')) return;
    try {
      setDiscarding(true);
      await discardAll();
    } catch (error) {
      showError('Git 全部放弃失败', error, '全部放弃失败');
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDiscardAll}
        disabled={discarding || files.length === 0}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red/10 text-red hover:bg-red/20 disabled:opacity-50 transition-all duration-200 active:scale-95"
      >
        {discarding ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
        全部放弃
      </button>
      <button
        onClick={handlePull}
        disabled={pulling}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-surface0 text-subtext1 hover:bg-surface1 disabled:opacity-50 transition-all duration-200 active:scale-95"
      >
        {pulling ? <Loader2 size={13} className="animate-spin" /> : <ArrowDown size={13} />}
        Pull
      </button>
      <button
        onClick={handlePush}
        disabled={pushing}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-surface0 text-subtext1 hover:bg-surface1 disabled:opacity-50 transition-all duration-200 active:scale-95"
      >
        {pushing ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
        Push
      </button>
    </div>
  );
}
