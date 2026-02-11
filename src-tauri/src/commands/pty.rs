use tauri::State;
use crate::pty::PtyManager;
use crate::state::AppState;
use crate::commands::ssh::SSHManager;

#[tauri::command]
pub fn pty_spawn(
    app: tauri::AppHandle,
    pty: State<'_, PtyManager>,
    state: State<'_, AppState>,
    ssh: State<'_, SSHManager>,
) -> Result<u32, String> {
    // 检查是否有活跃的 SSH 会话
    if let Some((host, port, username, private_key_path)) = ssh.get_active_session_info() {
        // 有活跃的 SSH 会话，启动 SSH 终端
        pty.spawn_ssh(app, host, port, username, private_key_path)
    } else {
        // 本地终端
        let cwd = state.get_root().to_string_lossy().to_string();
        pty.spawn(app, cwd)
    }
}

#[tauri::command]
pub fn pty_write(
    pty: State<'_, PtyManager>,
    id: u32,
    data: String,
) -> Result<(), String> {
    pty.write_input(id, &data)
}

#[tauri::command]
pub fn pty_resize(
    pty: State<'_, PtyManager>,
    id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    pty.resize(id, cols, rows)
}

#[tauri::command]
pub fn pty_kill(
    pty: State<'_, PtyManager>,
    id: u32,
) -> Result<(), String> {
    pty.kill(id)
}
