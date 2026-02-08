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
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            base_url: "https://api.openai.com".into(),
            api_key: String::new(),
            model: "gpt-4o-mini".into(),
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
    }))
}

#[tauri::command]
pub async fn save_ai_settings(
    state: State<'_, AppState>,
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let current = read_settings(&root);
    let updated = AiSettings {
        base_url: base_url.unwrap_or(current.base_url),
        api_key: api_key.unwrap_or(current.api_key),
        model: model.unwrap_or(current.model),
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

    let body = serde_json::json!({
        "model": settings.model,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert commit message generator. Generate a high-quality commit message based on the provided git diff.\n\nRules:\n1. Use Conventional Commits format: <type>(<scope>): <subject>\n2. Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build\n3. Scope should be the module/component affected (optional but preferred)\n4. Subject line: imperative mood, lowercase, no period, max 72 chars\n5. If changes are significant, add a blank line then a body with bullet points explaining key changes\n6. Body bullets should start with '- ' and explain WHY, not just WHAT\n7. If multiple unrelated changes exist, focus on the most important one for the subject\n8. Use Chinese for the commit message body if the code comments or file names suggest a Chinese project\n\nReply with ONLY the commit message, nothing else."
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
