import { ArrowUp, ArrowDown } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';

export default function GitActions() {
  const { push, pull } = useGitStore();

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-surface0">
      <button
        onClick={pull}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-surface0 text-subtext1 hover:bg-surface1 transition-colors"
      >
        <ArrowDown size={13} />
        Pull
      </button>
      <button
        onClick={push}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-surface0 text-subtext1 hover:bg-surface1 transition-colors"
      >
        <ArrowUp size={13} />
        Push
      </button>
    </div>
  );
}
