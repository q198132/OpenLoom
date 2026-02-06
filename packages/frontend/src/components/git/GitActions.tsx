import { useState } from 'react';
import { ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';

export default function GitActions() {
  const { push, pull } = useGitStore();
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);

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

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-surface0">
      <button
        onClick={handlePull}
        disabled={pulling}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-surface0 text-subtext1 hover:bg-surface1 disabled:opacity-50 transition-colors"
      >
        {pulling ? <Loader2 size={13} className="animate-spin" /> : <ArrowDown size={13} />}
        Pull
      </button>
      <button
        onClick={handlePush}
        disabled={pushing}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-surface0 text-subtext1 hover:bg-surface1 disabled:opacity-50 transition-colors"
      >
        {pushing ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
        Push
      </button>
    </div>
  );
}
