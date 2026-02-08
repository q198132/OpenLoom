use tauri::State;
use crate::pty::PtyManager;
use crate::state::AppState;

#[tauri::command]
pub fn pty_spawn(
    app: tauri::AppHandle,
    pty: State<'_, PtyManager>,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    pty.spawn(app, cwd)
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
