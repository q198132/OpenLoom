use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

const MAX_RECENT: usize = 5;

pub struct AppState {
    pub workspace_root: Mutex<PathBuf>,
    pub recent_projects: Mutex<Vec<String>>,
    pub snapshot_cache: Mutex<HashMap<String, String>>,
}

impl AppState {
    pub fn new() -> Self {
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let cwd_str = cwd.to_string_lossy().to_string();
        Self {
            workspace_root: Mutex::new(cwd),
            recent_projects: Mutex::new(vec![cwd_str]),
            snapshot_cache: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_root(&self) -> PathBuf {
        self.workspace_root.lock().unwrap().clone()
    }

    pub fn get_project_name(&self) -> String {
        let root = self.workspace_root.lock().unwrap();
        root.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default()
    }

    pub fn set_root(&self, new_path: PathBuf) {
        let resolved = new_path.canonicalize().unwrap_or(new_path);
        {
            let mut root = self.workspace_root.lock().unwrap();
            if *root == resolved {
                return;
            }
            *root = resolved.clone();
        }
        self.add_recent(resolved.to_string_lossy().to_string());
    }

    pub fn get_recent(&self) -> Vec<String> {
        self.recent_projects.lock().unwrap().clone()
    }

    fn add_recent(&self, path: String) {
        let mut list = self.recent_projects.lock().unwrap();
        list.retain(|p| p != &path);
        list.insert(0, path);
        list.truncate(MAX_RECENT);
    }
}
