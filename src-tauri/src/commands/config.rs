use crate::state::AppState;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct Shortcuts {
    #[serde(rename = "saveFile", default = "default_save_file")]
    pub save_file: String,
    #[serde(rename = "quickOpen", default = "default_quick_open")]
    pub quick_open: String,
    #[serde(rename = "globalSearch", default = "default_global_search")]
    pub global_search: String,
    #[serde(rename = "toggleSidebar", default = "default_toggle_sidebar")]
    pub toggle_sidebar: String,
    #[serde(rename = "gitCommit", default = "default_git_commit")]
    pub git_commit: String,
}

fn default_save_file() -> String {
    "Ctrl+S".into()
}
fn default_quick_open() -> String {
    "Ctrl+P".into()
}
fn default_global_search() -> String {
    "Ctrl+Shift+F".into()
}
fn default_toggle_sidebar() -> String {
    "Ctrl+B".into()
}
fn default_git_commit() -> String {
    "Ctrl+Enter".into()
}

impl Default for Shortcuts {
    fn default() -> Self {
        Self {
            save_file: default_save_file(),
            quick_open: default_quick_open(),
            global_search: default_global_search(),
            toggle_sidebar: default_toggle_sidebar(),
            git_commit: default_git_commit(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AiConfig {
    #[serde(rename = "baseUrl", default = "default_base_url")]
    pub base_url: String,
    #[serde(rename = "apiKey", default)]
    pub api_key: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(rename = "customPrompt", default)]
    pub custom_prompt: String,
}

fn default_base_url() -> String {
    "https://api.openai.com".into()
}
fn default_model() -> String {
    "gpt-4o-mini".into()
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            base_url: default_base_url(),
            api_key: String::new(),
            model: default_model(),
            custom_prompt: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(rename = "terminalFontSize", default = "default_font_size")]
    pub terminal_font_size: u16,
    #[serde(rename = "editorFontSize", default = "default_editor_font_size")]
    pub editor_font_size: u16,
    #[serde(default)]
    pub shortcuts: Shortcuts,
    #[serde(default)]
    pub ai: AiConfig,
}

fn default_font_size() -> u16 {
    15
}
fn default_editor_font_size() -> u16 {
    14
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            terminal_font_size: default_font_size(),
            editor_font_size: default_editor_font_size(),
            shortcuts: Shortcuts::default(),
            ai: AiConfig::default(),
        }
    }
}

fn config_path(root: &std::path::Path) -> PathBuf {
    root.join(".openloom").join("openloom.json")
}

pub(crate) fn read_config(root: &std::path::Path) -> AppConfig {
    let path = config_path(root);
    match std::fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

fn write_config(root: &std::path::Path, config: &AppConfig) -> Result<(), String> {
    let path = config_path(root);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

/// 返回配置时对 apiKey 做脱敏
fn mask_api_key(key: &str) -> String {
    if key.len() > 7 {
        format!("{}***{}", &key[..3], &key[key.len() - 4..])
    } else if !key.is_empty() {
        "***".into()
    } else {
        String::new()
    }
}

#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let config = read_config(&root);
    Ok(serde_json::json!({
        "terminalFontSize": config.terminal_font_size,
        "editorFontSize": config.editor_font_size,
        "shortcuts": {
            "saveFile": config.shortcuts.save_file,
            "quickOpen": config.shortcuts.quick_open,
            "globalSearch": config.shortcuts.global_search,
            "toggleSidebar": config.shortcuts.toggle_sidebar,
            "gitCommit": config.shortcuts.git_commit,
        },
        "ai": {
            "baseUrl": config.ai.base_url,
            "apiKey": mask_api_key(&config.ai.api_key),
            "model": config.ai.model,
            "customPrompt": config.ai.custom_prompt,
        }
    }))
}

#[tauri::command]
pub async fn save_config(
    state: State<'_, AppState>,
    config: serde_json::Value,
) -> Result<(), String> {
    let root = state.get_root();
    let current = read_config(&root);

    // 解析传入的配置，对 apiKey 做特殊处理：空字符串表示不修改
    let mut updated: AppConfig = serde_json::from_value(config).map_err(|e| e.to_string())?;

    if updated.ai.api_key.is_empty() || updated.ai.api_key.contains("***") {
        updated.ai.api_key = current.ai.api_key;
    }

    write_config(&root, &updated)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn read_config_uses_default_editor_font_size_when_missing() {
        let dir = tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join(".openloom")).unwrap();
        std::fs::write(
            dir.path().join(".openloom").join("openloom.json"),
            r#"{
  "terminalFontSize": 17,
  "shortcuts": {},
  "ai": {}
}"#,
        )
        .unwrap();

        let config = read_config(dir.path());

        assert_eq!(config.terminal_font_size, 17);
        assert_eq!(config.editor_font_size, 14);
    }

    #[test]
    fn write_config_persists_editor_font_size() {
        let dir = tempdir().unwrap();
        let config = AppConfig {
            terminal_font_size: 17,
            editor_font_size: 19,
            shortcuts: Shortcuts::default(),
            ai: AiConfig::default(),
        };

        write_config(dir.path(), &config).unwrap();

        let saved = read_config(dir.path());
        assert_eq!(saved.editor_font_size, 19);
    }

    #[test]
    fn app_config_defaults_keep_font_sizes_in_sync_with_frontend_expectations() {
        let config = AppConfig::default();

        assert_eq!(config.terminal_font_size, 15);
        assert_eq!(config.editor_font_size, 14);
    }
}
