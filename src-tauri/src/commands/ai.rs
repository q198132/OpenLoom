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

    let url = format!(
        "{}/v1/chat/completions",
        settings.base_url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "model": settings.model,
        "messages": [
            {
                "role": "system",
                "content": "You are a commit message generator. Based on the git diff provided, generate a concise and descriptive commit message following the Conventional Commits format (e.g., feat:, fix:, refactor:, docs:, chore:). Reply with ONLY the commit message, no explanation."
            },
            {
                "role": "user",
                "content": format!("Here is the git diff stat:\n{}\n\nHere is the diff:\n{}", stat, diff)
            }
        ],
        "max_tokens": 200,
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
