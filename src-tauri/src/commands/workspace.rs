use std::path::Path;
use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn get_workspace(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let path = state.get_root().to_string_lossy().to_string();
    let name = state.get_project_name();
    Ok(serde_json::json!({
        "path": path,
        "projectName": name,
    }))
}

#[tauri::command]
pub async fn open_workspace(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let p = std::path::PathBuf::from(&path);
    if !p.is_dir() {
        return Err("not a directory".into());
    }
    state.set_root(p);
    let new_path = state.get_root().to_string_lossy().to_string();
    let name = state.get_project_name();
    Ok(serde_json::json!({
        "ok": true,
        "path": new_path,
        "projectName": name,
    }))
}

#[tauri::command]
pub async fn browse_dirs(
    state: State<'_, AppState>,
    dir: Option<String>,
) -> Result<serde_json::Value, String> {
    let root = state.get_root().to_string_lossy().to_string();
    let target = dir.unwrap_or(root);
    let resolved = std::path::PathBuf::from(&target);

    let entries = std::fs::read_dir(&resolved).map_err(|e| e.to_string())?;
    let mut dirs: Vec<serde_json::Value> = Vec::new();

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') { continue; }
        if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) { continue; }
        let full = resolved.join(&name);
        let path_str = full.to_string_lossy().replace('\\', "/");
        dirs.push(serde_json::json!({ "name": name, "path": path_str }));
    }

    dirs.sort_by(|a, b| {
        let na = a["name"].as_str().unwrap_or("");
        let nb = b["name"].as_str().unwrap_or("");
        na.to_lowercase().cmp(&nb.to_lowercase())
    });

    let current = resolved.to_string_lossy().replace('\\', "/");
    let parent = resolved.parent()
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or(current.clone());

    Ok(serde_json::json!({
        "current": current,
        "parent": parent,
        "dirs": dirs,
    }))
}

#[tauri::command]
pub async fn get_recent(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    Ok(state.get_recent())
}
