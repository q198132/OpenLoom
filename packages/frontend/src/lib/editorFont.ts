import type { editor } from 'monaco-editor';
import { clampEditorFontSize, useConfigStore } from '@/stores/configStore';

type ZoomableEditor = editor.IStandaloneCodeEditor | editor.IStandaloneDiffEditor;

function getEditorWheelTarget(instance: ZoomableEditor): HTMLElement | null {
  if ('getContainerDomNode' in instance) {
    return instance.getContainerDomNode();
  }

  return (instance as editor.IStandaloneCodeEditor).getDomNode();
}

export function attachEditorFontWheelZoom(instance: ZoomableEditor): () => void {
  const domNode = getEditorWheelTarget(instance);
  if (!domNode) return () => {};

  let lastApplied = clampEditorFontSize(useConfigStore.getState().config.editorFontSize);
  let saveToken = 0;
  const unsubscribe = useConfigStore.subscribe((state) => {
    lastApplied = clampEditorFontSize(state.config.editorFontSize);
  });

  const onWheel = (event: WheelEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.deltaY === 0) return;

    event.preventDefault();

    const delta = event.deltaY < 0 ? 1 : -1;
    const next = clampEditorFontSize(lastApplied + delta);
    if (next === lastApplied) return;

    lastApplied = next;
    instance.updateOptions({ fontSize: next });
    useConfigStore.getState().setConfig({ editorFontSize: next });
    const token = ++saveToken;

    void useConfigStore.getState().updateConfig({ editorFontSize: next }).catch(() => {
      if (token !== saveToken) return;
      const fallback = clampEditorFontSize(useConfigStore.getState().config.editorFontSize);
      lastApplied = fallback;
      instance.updateOptions({ fontSize: fallback });
    });
  };

  domNode.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    unsubscribe();
    domNode.removeEventListener('wheel', onWheel);
  };
}
