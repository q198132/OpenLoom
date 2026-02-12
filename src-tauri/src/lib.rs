mod state;
mod commands;
mod watcher;
mod pty;

use tauri::Manager;
use state::AppState;
use pty::PtyManager;
use commands::ssh::SSHManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(PtyManager::new())
        .manage(SSHManager::new())
        .invoke_handler(tauri::generate_handler![
            // files
            commands::files::get_file_tree,
            commands::files::read_file,
            commands::files::write_file,
            commands::files::create_file,
            commands::files::create_dir,
            commands::files::rename_node,
            commands::files::delete_node,
            commands::files::search_files,
            commands::files::list_files,
            commands::files::read_file_binary,
            commands::files::reveal_in_explorer,
            // git
            commands::git::git_status,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_commit,
            commands::git::git_branches,
            commands::git::git_log,
            commands::git::git_show,
            commands::git::git_file_diff,
            commands::git::git_staged_diff,
            commands::git::git_sync_status,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_working_diff,
            // workspace
            commands::workspace::get_workspace,
            commands::workspace::open_workspace,
            commands::workspace::browse_dirs,
            commands::workspace::get_recent,
            // ai
            commands::ai::generate_commit_message,
            // pty
            commands::pty::pty_spawn,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
            // config
            commands::config::get_config,
            commands::config::save_config,
            // ssh
            commands::ssh::ssh_get_connections,
            commands::ssh::ssh_add_connection,
            commands::ssh::ssh_update_connection,
            commands::ssh::ssh_delete_connection,
            commands::ssh::ssh_connect,
            commands::ssh::ssh_connect_with_password,
            commands::ssh::ssh_disconnect,
            commands::ssh::ssh_get_session,
            commands::ssh::ssh_get_file_tree,
            commands::ssh::ssh_read_file,
            commands::ssh::ssh_write_file,
            commands::ssh::ssh_get_working_dir,
            commands::ssh::ssh_set_working_dir,
            commands::ssh::ssh_git_status,
            commands::ssh::ssh_git_log,
            commands::ssh::ssh_git_branches,
            commands::ssh::ssh_git_stage,
            commands::ssh::ssh_git_commit,
            // ssh 文件操作
            commands::ssh::ssh_create_dir,
            commands::ssh::ssh_delete_file,
            commands::ssh::ssh_delete_dir,
            commands::ssh::ssh_rename,
        ])
        .setup(|app| {
            let config_dir = app.path().app_data_dir().ok();
            let state = AppState::new(config_dir);
            app.manage(state);
            let state = app.state::<AppState>();
            watcher::start_watcher(app.handle().clone(), &state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
