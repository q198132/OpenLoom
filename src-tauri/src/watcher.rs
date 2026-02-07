use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;
use notify_debouncer_mini::new_debouncer;
use tauri::{AppHandle, Emitter};
use crate::state::AppState;

const IGNORED_DIRS: &[&str] = &[
    "node_modules", ".git", "dist", ".next", ".nuxt",
    ".output", "coverage", "__pycache__",
];

fn is_ignored_path(rel: &str) -> bool {
    rel.split('/').any(|p| IGNORED_DIRS.contains(&p))
}

pub fn start_watcher(
    app: AppHandle,
    state: &AppState,
) {
    let root = state.get_root();
    let root_clone = root.clone();

    std::thread::spawn(move || {
        let (tx, rx) = mpsc::channel();

        let mut debouncer = match new_debouncer(
            Duration::from_millis(300),
            tx,
        ) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("[watcher] failed to create: {}", e);
                return;
            }
        };

        if let Err(e) = debouncer.watcher().watch(
            &root_clone,
            notify::RecursiveMode::Recursive,
        ) {
            eprintln!("[watcher] failed to watch: {}", e);
            return;
        }

        println!("[watcher] watching {:?}", root_clone);

        loop {
            match rx.recv() {
                Ok(Ok(events)) => {
                    for event in events {
                        handle_event(
                            &app,
                            &root_clone,
                            &event,
                        );
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("[watcher] error: {}", e);
                }
                Err(_) => break,
            }
        }
    });
}

fn handle_event(
    app: &AppHandle,
    root: &PathBuf,
    event: &notify_debouncer_mini::DebouncedEvent,
) {
    let path = &event.path;
    let rel = match path.strip_prefix(root) {
        Ok(r) => r.to_string_lossy().replace('\\', "/"),
        Err(_) => return,
    };

    if is_ignored_path(&rel) {
        return;
    }

    if path.exists() && path.is_file() {
        // file-changed: add or change
        let _ = app.emit("file-changed", serde_json::json!({
            "event": "change",
            "path": rel,
        }));
    } else {
        // file-changed: unlink
        let _ = app.emit("file-changed", serde_json::json!({
            "event": "unlink",
            "path": rel,
        }));
    }
}
