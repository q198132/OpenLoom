import { useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useLayoutStore } from '@/stores/layoutStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useEditorStore } from '@/stores/editorStore';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useGitStore } from '@/stores/gitStore';
import { useControlSocket } from '@/hooks/useWebSocket';
import type { ControlMessage } from '@claudegui/shared';
import TopBar from './TopBar';
import SidebarContainer from './SidebarContainer';
import EditorPanel from '../editor/EditorPanel';
import TerminalPanel from '../terminal/TerminalPanel';
import FolderBrowserDialog from '../workspace/FolderBrowserDialog';

export default function AppLayout() {
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);

  // 监听 WebSocket workspace-changed 消息
  const handleControlMessage = useCallback((msg: ControlMessage) => {
    if (msg.type === 'workspace-changed') {
      useWorkspaceStore.getState().fetchWorkspace();
      useWorkspaceStore.getState().fetchRecent();
      useEditorStore.getState().clearAll();
      useFileTreeStore.getState().refreshRoot();
      useGitStore.getState().fetchStatus();
      useGitStore.getState().fetchBranch();
      useGitStore.getState().fetchLog();
    }
  }, []);

  useControlSocket(handleControlMessage);

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <PanelGroup direction="horizontal" className="flex-1">
        {sidebarVisible && (
          <>
            <Panel
              defaultSize={20}
              minSize={15}
              maxSize={40}
              id="sidebar"
              order={1}
            >
              <SidebarContainer />
            </Panel>
            <PanelResizeHandle className="w-[3px]" />
          </>
        )}
        <Panel id="main" order={2}>
          <PanelGroup direction="vertical">
            <Panel
              defaultSize={60}
              minSize={20}
              id="editor"
              order={1}
            >
              <EditorPanel />
            </Panel>
            <PanelResizeHandle className="h-[3px]" />
            <Panel
              defaultSize={40}
              minSize={15}
              id="terminal"
              order={2}
            >
              <TerminalPanel />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
      <FolderBrowserDialog />
    </div>
  );
}
