import { useCallback } from 'react';
import AppLayout from './components/layout/AppLayout';
import { useControlSocket } from './hooks/useWebSocket';
import { useDiffReviewStore } from './stores/diffReviewStore';
import type { ControlMessage } from '@claudegui/shared';

export default function App() {
  const addReview = useDiffReviewStore((s) => s.addReview);

  const onControlMessage = useCallback(
    (msg: ControlMessage) => {
      if (msg.type === 'file-snapshot') {
        addReview({
          path: msg.path,
          oldContent: msg.oldContent,
          newContent: msg.newContent,
          timestamp: Date.now(),
        });
      }
    },
    [addReview],
  );

  useControlSocket(onControlMessage);

  return <AppLayout />;
}
