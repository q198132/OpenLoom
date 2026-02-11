import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLayoutStore } from '@/stores/layoutStore';
import { useConfigStore } from '@/stores/configStore';
import type { AppConfig, Shortcuts, AiConfig } from '@/stores/configStore';

type Tab = 'general' | 'shortcuts' | 'ai';

const TAB_LABELS: Record<Tab, string> = {
  general: '通用',
  shortcuts: '快捷键',
  ai: 'AI',
};

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  saveFile: '保存文件',
  quickOpen: '快速打开',
  globalSearch: '全局搜索',
  toggleSidebar: '切换侧栏',
  gitCommit: 'Git 提交',
};

export default function SettingsDialog() {
  const { settingsVisible, toggleSettings } = useLayoutStore();
  const { config, loadConfig, updateConfig } = useConfigStore();

  const [tab, setTab] = useState<Tab>('general');
  const [form, setForm] = useState<AppConfig & { _apiKey: string }>({
    ...config,
    _apiKey: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsVisible) {
      loadConfig().then(() => {
        const c = useConfigStore.getState().config;
        setForm({ ...c, _apiKey: '' });
        setTab('general');
      });
    }
  }, [settingsVisible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { _apiKey, ...rest } = form;
      const toSave: AppConfig = {
        ...rest,
        ai: { ...rest.ai, apiKey: _apiKey },
      };
      await updateConfig(toSave);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
    toggleSettings();
  };

  if (!settingsVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center pt-[12vh] z-50"
      onClick={toggleSettings}
    >
      <div
        className="bg-base border border-surface0 rounded-lg shadow-xl w-[480px] max-h-[560px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface0">
          <span className="text-sm font-semibold text-text">设置</span>
          <button
            onClick={toggleSettings}
            className="p-1 rounded hover:bg-surface0 text-subtext0 hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab 栏 */}
        <div className="flex border-b border-surface0 px-4 gap-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                tab === t
                  ? 'text-accent'
                  : 'text-subtext0 hover:text-text'
              }`}
            >
              {TAB_LABELS[t]}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
          {tab === 'general' && (
            <GeneralTab form={form} setForm={setForm} />
          )}
          {tab === 'shortcuts' && (
            <ShortcutsTab form={form} setForm={setForm} />
          )}
          {tab === 'ai' && (
            <AiTab form={form} setForm={setForm} maskedKey={config.ai.apiKey} />
          )}
        </div>

        {/* 按钮 */}
        <div className="flex gap-2 px-4 py-3 border-t border-surface0">
          <button
            onClick={toggleSettings}
            className="flex-1 py-1.5 text-xs rounded bg-surface1 text-subtext1 hover:bg-surface2 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-1.5 text-xs font-medium rounded bg-accent text-crust hover:bg-accent/80 disabled:opacity-40 transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- 通用设置 ---- */
function GeneralTab({
  form,
  setForm,
}: {
  form: AppConfig & { _apiKey: string };
  setForm: React.Dispatch<React.SetStateAction<AppConfig & { _apiKey: string }>>;
}) {
  return (
    <>
      <Field label="终端字体大小">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={10}
            max={24}
            value={form.terminalFontSize}
            onChange={(e) =>
              setForm({ ...form, terminalFontSize: Number(e.target.value) })
            }
            className="flex-1 accent-accent"
          />
          <span className="text-xs text-text w-6 text-right">
            {form.terminalFontSize}
          </span>
        </div>
      </Field>
    </>
  );
}

/* ---- 快捷键设置 ---- */
function ShortcutsTab({
  form,
  setForm,
}: {
  form: AppConfig & { _apiKey: string };
  setForm: React.Dispatch<React.SetStateAction<AppConfig & { _apiKey: string }>>;
}) {
  const updateShortcut = (key: keyof Shortcuts, value: string) => {
    setForm({
      ...form,
      shortcuts: { ...form.shortcuts, [key]: value },
    });
  };

  return (
    <>
      <p className="text-xs text-subtext0 leading-relaxed">
        格式示例：Ctrl+S、Ctrl+Shift+F、Alt+P。macOS 下 Ctrl 等同于 Cmd。
      </p>
      {(Object.keys(SHORTCUT_LABELS) as (keyof Shortcuts)[]).map((key) => (
        <Field key={key} label={SHORTCUT_LABELS[key]}>
          <input
            type="text"
            value={form.shortcuts[key]}
            onChange={(e) => updateShortcut(key, e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
          />
        </Field>
      ))}
    </>
  );
}

/* ---- AI 设置 ---- */
function AiTab({
  form,
  setForm,
  maskedKey,
}: {
  form: AppConfig & { _apiKey: string };
  setForm: React.Dispatch<React.SetStateAction<AppConfig & { _apiKey: string }>>;
  maskedKey: string;
}) {
  const updateAi = (key: keyof AiConfig, value: string) => {
    if (key === 'apiKey') {
      setForm({ ...form, _apiKey: value });
    } else {
      setForm({ ...form, ai: { ...form.ai, [key]: value } });
    }
  };

  return (
    <>
      <p className="text-xs text-subtext0 leading-relaxed">
        配置 AI 服务后，可在 Git 提交框中点击「生成」按钮自动生成 commit message。支持任何 OpenAI 兼容 API。
      </p>

      <Field label="Base URL">
        <input
          type="text"
          value={form.ai.baseUrl}
          onChange={(e) => updateAi('baseUrl', e.target.value)}
          placeholder="https://api.openai.com"
          className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
        />
      </Field>

      <Field label="API Key">
        <input
          type="password"
          value={form._apiKey}
          onChange={(e) => updateAi('apiKey', e.target.value)}
          placeholder={maskedKey ? `当前: ${maskedKey}` : '输入 API Key...'}
          className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
        />
      </Field>

      <Field label="Model">
        <input
          type="text"
          value={form.ai.model}
          onChange={(e) => updateAi('model', e.target.value)}
          placeholder="gpt-4o-mini"
          className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
        />
      </Field>

      <Field label="自定义提示词">
        <textarea
          value={form.ai.customPrompt}
          onChange={(e) => updateAi('customPrompt', e.target.value)}
          placeholder="留空则使用默认提示词..."
          rows={4}
          className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent resize-none"
        />
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-subtext0 mb-1">{label}</label>
      {children}
    </div>
  );
}
