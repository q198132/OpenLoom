use tauri::State;
use crate::pty::PtyManager;
use crate::state::AppState;

#[tauri::command]
pub fn pty_spawn(
    app: tauri::AppHandle,
    pty: State<'_, PtyManager>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let cwd = state.get_root().to_string_lossy().to_string();
    pty.spawn(app, cwd)
}

#[tauri::command]
pub fn pty_write(
    pty: State<'_, PtyManager>,
    data: String,
) -> Result<(), String> {
    pty.write_input(&data)
}

#[tauri::command]
pub fn pty_resize(
    pty: State<'_, PtyManager>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    pty.resize(cols, rows)
}
