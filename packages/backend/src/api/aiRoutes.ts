import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { workspaceManager } from '../workspace/workspaceManager.js';

const router = Router();

interface AiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_SETTINGS: AiSettings = {
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
};

function getSettingsPath(): string {
  return path.join(workspaceManager.getRoot(), '.openloom', 'settings.json');
}

async function readSettings(): Promise<AiSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf-8');
    const data = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...data };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function writeSettings(settings: AiSettings): Promise<void> {
  const dir = path.dirname(getSettingsPath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

// GET /api/ai/settings
router.get('/settings', async (_req, res) => {
  try {
    const settings = await readSettings();
    // apiKey 脱敏
    const masked = settings.apiKey
      ? settings.apiKey.slice(0, 3) + '***' + settings.apiKey.slice(-4)
      : '';
    res.json({ baseUrl: settings.baseUrl, apiKey: masked, model: settings.model });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/settings
router.post('/settings', async (req, res) => {
  try {
    const { baseUrl, apiKey, model } = req.body as Partial<AiSettings>;
    const current = await readSettings();
    const updated: AiSettings = {
      baseUrl: baseUrl ?? current.baseUrl,
      apiKey: apiKey ?? current.apiKey,
      model: model ?? current.model,
    };
    await writeSettings(updated);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/generate-commit
router.post('/generate-commit', async (req, res) => {
  try {
    const { diff, stat } = req.body as { diff: string; stat: string };
    const settings = await readSettings();

    if (!settings.apiKey) {
      return res.status(400).json({ error: 'No API Key configured' });
    }

    const url = `${settings.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a commit message generator. Based on the git diff provided, generate a concise and descriptive commit message following the Conventional Commits format (e.g., feat:, fix:, refactor:, docs:, chore:). Reply with ONLY the commit message, no explanation.',
          },
          {
            role: 'user',
            content: `Here is the git diff stat:\n${stat}\n\nHere is the diff:\n${diff}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `AI API error: ${errText}` });
    }

    const data = (await response.json()) as any;
    const message = data.choices?.[0]?.message?.content?.trim() || '';
    res.json({ message });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
