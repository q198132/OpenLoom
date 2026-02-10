use std::path::PathBuf;
use tauri::State;
use serde::{Deserialize, Serialize};
use crate::state::AppState;

#[derive(Serialize, Deserialize, Clone)]
pub struct AiSettings {
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    pub model: String,
    #[serde(rename = "customPrompt", default)]
    pub custom_prompt: String,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            base_url: "https://api.openai.com".into(),
            api_key: String::new(),
            model: "gpt-4o-mini".into(),
            custom_prompt: String::new(),
        }
    }
}

fn settings_path(root: &std::path::Path) -> PathBuf {
    root.join(".openloom").join("settings.json")
}

fn read_settings(root: &std::path::Path) -> AiSettings {
    let path = settings_path(root);
    match std::fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => AiSettings::default(),
    }
}

fn write_settings(root: &std::path::Path, settings: &AiSettings) -> Result<(), String> {
    let path = settings_path(root);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_ai_settings(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let settings = read_settings(&root);
    let masked = if settings.api_key.len() > 7 {
        format!("{}***{}", &settings.api_key[..3], &settings.api_key[settings.api_key.len()-4..])
    } else if !settings.api_key.is_empty() {
        "***".into()
    } else {
        String::new()
    };
    Ok(serde_json::json!({
        "baseUrl": settings.base_url,
        "apiKey": masked,
        "model": settings.model,
        "customPrompt": settings.custom_prompt,
    }))
}

#[tauri::command]
pub async fn save_ai_settings(
    state: State<'_, AppState>,
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
    custom_prompt: Option<String>,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let current = read_settings(&root);
    let updated = AiSettings {
        base_url: base_url.unwrap_or(current.base_url),
        api_key: api_key.unwrap_or(current.api_key),
        model: model.unwrap_or(current.model),
        custom_prompt: custom_prompt.unwrap_or(current.custom_prompt),
    };
    write_settings(&root, &updated)?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn generate_commit_message(
    state: State<'_, AppState>,
    diff: String,
    stat: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let settings = read_settings(&root);

    if settings.api_key.is_empty() {
        return Err("No API Key configured".into());
    }

    let base = settings.base_url.trim_end_matches('/');
    // 如果 base_url 已经包含路径（如 /api/v3），直接拼接 /chat/completions
    // 否则按 OpenAI 标准拼接 /v1/chat/completions
    let url = if base.ends_with("/v1") || base.contains("/api/") {
        format!("{}/chat/completions", base)
    } else {
        format!("{}/v1/chat/completions", base)
    };

    // 截断过长的 diff，避免超出 token 限制
    let max_diff_len = 8000;
    let truncated_diff = if diff.len() > max_diff_len {
        format!("{}...\n[diff truncated]", &diff[..max_diff_len])
    } else {
        diff.clone()
    };

    let default_prompt = "你是一个专业的 Git 提交信息生成器。请根据提供的 git diff 生成高质量的中文提交信息。\n\n规则：\n1. 使用 Conventional Commits 格式：<type>(<scope>): <中文描述>\n2. type 类型：feat、fix、refactor、docs、style、test、chore、perf、ci、build\n3. scope 为受影响的模块/组件（可选但推荐）\n4. 主题行：祈使语气，不加句号，最多 72 字符\n5. 如果变更较大，空一行后用要点说明关键变更\n6. 要点以 '- ' 开头，解释「为什么」而非仅描述「做了什么」\n7. 如果有多个不相关的变更，主题行聚焦最重要的那个\n8. 提交信息的描述部分必须使用中文\n\n只回复提交信息本身，不要有任何其他内容。";
    let system_prompt = if settings.custom_prompt.is_empty() {
        default_prompt.to_string()
    } else {
        format!("{}\n\n{}", default_prompt, settings.custom_prompt)
    };

    let body = serde_json::json!({
        "model": settings.model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": format!("Git diff stat:\n{}\n\nDiff content:\n{}", stat, truncated_diff)
            }
        ],
        "max_tokens": 500,
        "temperature": 0.3,
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", settings.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("AI API error: {}", err_text));
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let message = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();

    Ok(serde_json::json!({ "message": message }))
}
