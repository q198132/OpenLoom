use std::process::Command;
use tauri::State;
use crate::state::AppState;

fn git(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(stderr);
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn git_raw(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(stderr);
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn git_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let raw = git_raw(&["status", "--porcelain=v1"], &cwd)?;
    let files: Vec<serde_json::Value> = raw
        .lines()
        .filter(|l| l.len() >= 2)
        .map(|line| {
            let x = line.chars().next().unwrap_or(' ');
            let y = line.chars().nth(1).unwrap_or(' ');
            let file_path = line[3..].trim().to_string();

            let status = if x == '?' && y == '?' {
                "untracked"
            } else if x == 'A' || y == 'A' {
                "added"
            } else if x == 'D' || y == 'D' {
                "deleted"
            } else if x == 'R' || y == 'R' {
                "renamed"
            } else {
                "modified"
            };

            let staged = x != ' ' && x != '?';
            serde_json::json!({ "path": file_path, "status": status, "staged": staged })
        })
        .collect();
    Ok(serde_json::json!(files))
}

#[tauri::command]
pub async fn git_stage(state: State<'_, AppState>, paths: Vec<String>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let mut args = vec!["add"];
    let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    args.extend(path_refs);
    git(&args, &cwd)?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn git_unstage(state: State<'_, AppState>, paths: Vec<String>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let mut args = vec!["reset", "HEAD"];
    let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    args.extend(path_refs);
    git(&args, &cwd)?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub async fn git_commit(state: State<'_, AppState>, message: String) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let result = git(&["commit", "-m", &message], &cwd)?;
    Ok(serde_json::json!({ "ok": true, "result": result }))
}

#[tauri::command]
pub async fn git_branches(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let raw = git(&["branch", "--no-color"], &cwd)?;
    let mut current = String::new();
    let mut branches: Vec<String> = Vec::new();
    for line in raw.lines() {
        let name = line.trim_start_matches('*').trim().to_string();
        if line.starts_with('*') {
            current = name.clone();
        }
        branches.push(name);
    }
    Ok(serde_json::json!({ "current": current, "branches": branches }))
}

#[tauri::command]
pub async fn git_log(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let raw = git(&["log", "--all", "--format=%H|%h|%s|%an|%ci|%D", "-30"], &cwd)?;
    let entries: Vec<serde_json::Value> = raw
        .lines()
        .filter(|l| !l.is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.splitn(6, '|').collect();
            serde_json::json!({
                "hash": parts.first().unwrap_or(&""),
                "shortHash": parts.get(1).unwrap_or(&""),
                "message": parts.get(2).unwrap_or(&""),
                "author": parts.get(3).unwrap_or(&""),
                "date": parts.get(4).unwrap_or(&""),
                "refs": parts.get(5).unwrap_or(&""),
            })
        })
        .collect();
    Ok(serde_json::json!(entries))
}

#[tauri::command]
pub async fn git_show(state: State<'_, AppState>, hash: String) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let info = git(&["show", "--stat=999", "--format=%H|%h|%s|%an|%ae|%ci|%b", &hash], &cwd)?;
    let lines: Vec<&str> = info.lines().collect();
    if lines.is_empty() {
        return Err("empty output".into());
    }

    let header_parts: Vec<&str> = lines[0].splitn(7, '|').collect();
    let full_hash = header_parts.first().unwrap_or(&"").to_string();
    let short_hash = header_parts.get(1).unwrap_or(&"").to_string();
    let subject = header_parts.get(2).unwrap_or(&"").to_string();
    let author = header_parts.get(3).unwrap_or(&"").to_string();
    let email = header_parts.get(4).unwrap_or(&"").to_string();
    let date = header_parts.get(5).unwrap_or(&"").to_string();
    let body = header_parts.get(6).unwrap_or(&"").trim().to_string();

    let mut changed_files: Vec<serde_json::Value> = Vec::new();
    for fl in &lines[1..] {
        if let Some(caps) = fl.find(" | ") {
            let file = fl[..caps].trim().to_string();
            let stats = fl[caps + 3..].trim().to_string();
            changed_files.push(serde_json::json!({ "file": file, "stats": stats }));
        }
    }

    Ok(serde_json::json!({
        "hash": full_hash, "shortHash": short_hash,
        "subject": subject, "author": author,
        "email": email, "date": date, "body": body,
        "files": changed_files,
    }))
}

#[tauri::command]
pub async fn git_file_diff(
    state: State<'_, AppState>,
    hash: String,
    file: String,
) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();

    let new_content = git(&["show", &format!("{}:{}", hash, file)], &cwd)
        .unwrap_or_default();
    let old_content = git(&["show", &format!("{}~1:{}", hash, file)], &cwd)
        .unwrap_or_default();

    Ok(serde_json::json!({
        "oldContent": old_content,
        "newContent": new_content,
        "file": file,
    }))
}

#[tauri::command]
pub async fn git_staged_diff(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let stat = git(&["diff", "--cached", "--stat"], &cwd).unwrap_or_default();

    let diff_raw = git_raw(&["diff", "--cached"], &cwd).unwrap_or_default();
    let max_len = 30 * 1024;
    let diff = if diff_raw.len() > max_len {
        format!("{}\n... [diff truncated]", &diff_raw[..max_len])
    } else {
        diff_raw
    };

    let status_out = git(&["diff", "--cached", "--name-status"], &cwd).unwrap_or_default();
    let files: Vec<serde_json::Value> = status_out
        .lines()
        .filter(|l| !l.is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.splitn(2, '\t').collect();
            let status = parts.first().unwrap_or(&"").to_string();
            let path = parts.get(1).unwrap_or(&"").to_string();
            serde_json::json!({ "status": status, "path": path })
        })
        .collect();

    Ok(serde_json::json!({ "stat": stat, "diff": diff, "files": files }))
}

#[tauri::command]
pub async fn git_sync_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();

    // 先尝试 @{u}，失败则用 origin/<branch> 作为 fallback
    let upstream = if git(&["rev-parse", "--abbrev-ref", "@{u}"], &cwd).is_ok() {
        "@{u}".to_string()
    } else {
        let branch = git(&["branch", "--show-current"], &cwd).unwrap_or_default();
        if branch.is_empty() {
            return Ok(serde_json::json!({ "ahead": 0, "behind": 0, "hasRemote": false }));
        }
        let remote_ref = format!("origin/{}", branch);
        if git(&["rev-parse", &remote_ref], &cwd).is_err() {
            return Ok(serde_json::json!({ "ahead": 0, "behind": 0, "hasRemote": false }));
        }
        remote_ref
    };

    let ahead = git(&["rev-list", "--count", &format!("{}..HEAD", upstream)], &cwd)
        .and_then(|s| s.trim().parse::<i64>().map_err(|e| e.to_string()))
        .unwrap_or(0);
    let behind = git(&["rev-list", "--count", &format!("HEAD..{}", upstream)], &cwd)
        .and_then(|s| s.trim().parse::<i64>().map_err(|e| e.to_string()))
        .unwrap_or(0);
    Ok(serde_json::json!({ "ahead": ahead, "behind": behind, "hasRemote": true }))
}

#[tauri::command]
pub async fn git_push(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let result = git(&["push"], &cwd)?;
    Ok(serde_json::json!({ "ok": true, "result": result }))
}

#[tauri::command]
pub async fn git_pull(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let result = git(&["pull"], &cwd)?;
    Ok(serde_json::json!({ "ok": true, "result": result }))
}

#[tauri::command]
pub async fn git_working_diff(
    state: State<'_, AppState>,
    file: String,
    staged: Option<bool>,
) -> Result<serde_json::Value, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    let is_staged = staged.unwrap_or(false);

    let (old_content, new_content) = if is_staged {
        let old = git(&["show", &format!("HEAD:{}", file)], &cwd).unwrap_or_default();
        let new = git(&["show", &format!(":{}", file)], &cwd).unwrap_or_default();
        (old, new)
    } else {
        let old = git(&["show", &format!(":{}", file)], &cwd)
            .or_else(|_| git(&["show", &format!("HEAD:{}", file)], &cwd))
            .unwrap_or_default();
        let full_path = std::path::Path::new(&cwd).join(&file);
        let new = std::fs::read_to_string(&full_path).unwrap_or_default();
        (old, new)
    };

    Ok(serde_json::json!({
        "oldContent": old_content,
        "newContent": new_content,
        "file": file,
    }))
}
