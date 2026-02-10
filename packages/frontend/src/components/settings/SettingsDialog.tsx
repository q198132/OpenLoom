import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAiSettingsStore } from '@/stores/aiSettingsStore';

export default function SettingsDialog() {
  const { settingsVisible, toggleSettings } = useLayoutStore();
  const { baseUrl, apiKey, model, customPrompt, fetchSettings } = useAiSettingsStore();
  const saveSettings = useAiSettingsStore((s) => s.saveSettings);

  const [form, setForm] = useState({ baseUrl: '', apiKey: '', model: '', customPrompt: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsVisible) {
      fetchSettings().then(() => {
        setForm({
          baseUrl: useAiSettingsStore.getState().baseUrl,
          apiKey: '',
          model: useAiSettingsStore.getState().model,
          customPrompt: useAiSettingsStore.getState().customPrompt,
        });
      });
    }
  }, [settingsVisible]);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings({
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      model: form.model,
      customPrompt: form.customPrompt,
    });
    setSaving(false);
    toggleSettings();
  };

  if (!settingsVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center pt-[15vh] z-50"
      onClick={toggleSettings}
    >
      <div
        className="bg-base border border-surface0 rounded-lg shadow-xl w-[440px] max-h-[520px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface0">
          <span className="text-sm font-semibold text-text">AI 设置</span>
          <button
            onClick={toggleSettings}
            className="p-1 rounded hover:bg-surface0 text-subtext0 hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 表单 */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto">
          <p className="text-xs text-subtext0 leading-relaxed">
            配置 AI 服务后，可在 Git 提交框中点击「生成」按钮，基于暂存区 diff 自动生成语义化的 commit message。支持任何 OpenAI 兼容 API（如 OpenAI、DeepSeek、Ollama 等）。未配置时将使用基于规则的简单摘要。
          </p>

          <Field label="Base URL">
            <input
              type="text"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.openai.com"
              className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
            />
          </Field>

          <Field label="API Key">
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={apiKey ? `当前: ${apiKey}` : '输入 API Key...'}
              className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
            />
          </Field>

          <Field label="Model">
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
            />
          </Field>

          <Field label="自定义提示词">
            <textarea
              value={form.customPrompt}
              onChange={(e) => setForm({ ...form, customPrompt: e.target.value })}
              placeholder="留空则使用默认提示词。可自定义 AI 生成 commit message 时的 system prompt..."
              rows={4}
              className="w-full px-2 py-1.5 text-xs bg-crust border border-surface0 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent resize-none"
            />
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-subtext0 mb-1">{label}</label>
      {children}
    </div>
  );
}
