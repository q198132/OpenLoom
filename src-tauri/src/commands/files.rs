use std::path::{Path, PathBuf};
use tauri::State;
use serde::Serialize;
use base64::{Engine as _, engine::general_purpose};
use crate::state::AppState;

const IGNORED_DIRS: &[&str] = &[
    "node_modules", ".git", "dist", ".next", ".nuxt",
    ".output", "coverage", "__pycache__",
];

const IGNORED_FILES: &[&str] = &[".DS_Store", "Thumbs.db"];

const BINARY_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "bmp", "ico", "svg", "webp",
    "mp3", "mp4", "avi", "mov", "wav", "flac",
    "zip", "tar", "gz", "rar", "7z",
    "exe", "dll", "so", "dylib", "bin",
    "pdf", "doc", "docx", "xls", "xlsx",
    "woff", "woff2", "ttf", "eot", "otf",
];

#[derive(Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub file: String,
    pub line: String,
    #[serde(rename = "lineNumber")]
    pub line_number: usize,
    pub column: usize,
}

fn safe_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let full = root.join(relative);
    let root_resolved = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
    // 文件可能尚不存在（新建场景），尝试 canonicalize 父目录再拼接文件名
    let resolved = match full.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            if let Some(parent) = full.parent() {
                let parent_resolved = parent.canonicalize().unwrap_or_else(|_| parent.to_path_buf());
                let file_name = full.file_name().ok_or("Invalid path")?;
                parent_resolved.join(file_name)
            } else {
                full.clone()
            }
        }
    };
    if !resolved.starts_with(&root_resolved) {
        return Err("Path traversal detected".into());
    }
    Ok(resolved)
}

fn is_ignored(name: &str, is_dir: bool) -> bool {
    if is_dir {
        IGNORED_DIRS.contains(&name)
    } else {
        IGNORED_FILES.contains(&name)
    }
}

#[tauri::command]
pub async fn get_file_tree(
    state: State<'_, AppState>,
    dir: Option<String>,
) -> Result<Vec<FileNode>, String> {
    let root = state.get_root();
    let rel = dir.unwrap_or_default();
    let full_path = safe_path(&root, &rel)?;

    let entries = std::fs::read_dir(&full_path)
        .map_err(|e| e.to_string())?;

    let mut nodes = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);

        if is_ignored(&name, is_dir) {
            continue;
        }

        let node_path = if rel.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", rel, name)
        };

        nodes.push(FileNode {
            name,
            path: node_path,
            is_directory: is_dir,
        });
    }

    nodes.sort_by(|a, b| {
        if a.is_directory != b.is_directory {
            return if a.is_directory {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            };
        }
        a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });

    Ok(nodes)
}

#[tauri::command]
pub async fn read_file(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let full_path = safe_path(&root, &path)?;
    let content = std::fs::read_to_string(&full_path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "content": content, "path": path }))
}

#[tauri::command]
pub async fn write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let full_path = safe_path(&root, &path)?;
    std::fs::write(&full_path, &content).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn create_file(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let full_path = safe_path(&root, &path)?;
    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&full_path, "").map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn create_dir(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let full_path = safe_path(&root, &path)?;
    std::fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn rename_node(
    state: State<'_, AppState>,
    old_path: String,
    new_path: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let full_old = safe_path(&root, &old_path)?;
    let full_new = safe_path(&root, &new_path)?;
    std::fs::rename(&full_old, &full_new).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn delete_node(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let full_path = safe_path(&root, &path)?;
    let meta = std::fs::metadata(&full_path).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        std::fs::remove_dir_all(&full_path).map_err(|e| e.to_string())?;
    } else {
        std::fs::remove_file(&full_path).map_err(|e| e.to_string())?;
    }
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn search_files(
    state: State<'_, AppState>,
    q: String,
    max_results: Option<usize>,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let max = max_results.unwrap_or(100).min(500);
    let mut results: Vec<SearchResult> = Vec::new();

    fn walk(
        dir: &Path,
        rel: &str,
        query: &str,
        results: &mut Vec<SearchResult>,
        max: usize,
    ) {
        if results.len() >= max { return; }
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            if results.len() >= max { return; }
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            if is_dir && IGNORED_DIRS.contains(&name.as_str()) { continue; }
            if !is_dir && IGNORED_FILES.contains(&name.as_str()) { continue; }

            let rel_path = if rel.is_empty() {
                name.clone()
            } else {
                format!("{}/{}", rel, name)
            };

            if is_dir {
                walk(&entry.path(), &rel_path, query, results, max);
            } else {
                let ext = Path::new(&name)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if BINARY_EXTS.contains(&ext.as_str()) { continue; }
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
                    for (i, line) in content.lines().enumerate() {
                        if results.len() >= max { return; }
                        if let Some(col) = line.find(query) {
                            let truncated = if line.len() > 200 {
                                &line[..200]
                            } else {
                                line
                            };
                            results.push(SearchResult {
                                file: rel_path.clone(),
                                line: truncated.to_string(),
                                line_number: i + 1,
                                column: col,
                            });
                        }
                    }
                }
            }
        }
    }

    walk(&root, "", &q, &mut results, max);
    Ok(serde_json::json!({ "results": results }))
}

#[tauri::command]
pub async fn list_files(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let root = state.get_root();
    let mut files: Vec<String> = Vec::new();

    fn walk(dir: &Path, rel: &str, files: &mut Vec<String>) {
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            if is_dir && IGNORED_DIRS.contains(&name.as_str()) { continue; }
            if !is_dir && IGNORED_FILES.contains(&name.as_str()) { continue; }

            let rel_path = if rel.is_empty() {
                name.clone()
            } else {
                format!("{}/{}", rel, name)
            };

            if is_dir {
                walk(&entry.path(), &rel_path, files);
            } else {
                files.push(rel_path);
            }
        }
    }

    walk(&root, "", &mut files);
    Ok(files)
}

#[tauri::command]
pub async fn read_file_binary(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let root = state.get_root();
    let full_path = safe_path(&root, &path)?;
    let bytes = std::fs::read(&full_path).map_err(|e| e.to_string())?;
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(serde_json::json!({ "data": b64, "path": path }))
}

#[tauri::command]
pub async fn reveal_in_explorer(
    state: State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let root = state.get_root();
    let full_path = safe_path(&root, &path)?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&full_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&full_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = full_path.parent() {
            std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
