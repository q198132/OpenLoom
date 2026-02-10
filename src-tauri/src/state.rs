use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

const MAX_RECENT: usize = 5;

/// 持久化到磁盘的配置
#[derive(serde::Serialize, serde::Deserialize, Default)]
struct PersistedConfig {
    last_workspace: Option<String>,
    recent_projects: Vec<String>,
}

pub struct AppState {
    pub workspace_root: Mutex<PathBuf>,
    pub recent_projects: Mutex<Vec<String>>,
    pub snapshot_cache: Mutex<HashMap<String, String>>,
    config_path: Option<PathBuf>,
}

impl AppState {
    pub fn new(config_dir: Option<PathBuf>) -> Self {
        let config_path = config_dir.map(|d| d.join("workspace.json"));

        // 尝试从磁盘加载配置
        let persisted = config_path.as_ref()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str::<PersistedConfig>(&s).ok())
            .unwrap_or_default();

        // 优先用上次的工作区，否则用 cwd
        let cwd = persisted.last_workspace
            .as_ref()
            .map(PathBuf::from)
            .filter(|p| p.is_dir())
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

        let recent = if persisted.recent_projects.is_empty() {
            vec![cwd.to_string_lossy().to_string()]
        } else {
            persisted.recent_projects
        };

        Self {
            workspace_root: Mutex::new(cwd),
            recent_projects: Mutex::new(recent),
            snapshot_cache: Mutex::new(HashMap::new()),
            config_path,
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
        // Windows canonicalize 会加 \\?\ 前缀，CMD 不支持，需要去掉
        #[cfg(target_os = "windows")]
        let resolved = {
            let s = resolved.to_string_lossy();
            if let Some(stripped) = s.strip_prefix(r"\\?\") {
                PathBuf::from(stripped)
            } else {
                resolved
            }
        };
        {
            let mut root = self.workspace_root.lock().unwrap();
            if *root == resolved {
                return;
            }
            *root = resolved.clone();
        }
        self.add_recent(resolved.to_string_lossy().to_string());
        self.save_config();
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

    /// 将当前工作区和最近项目持久化到磁盘
    fn save_config(&self) {
        let Some(ref path) = self.config_path else { return };
        let config = PersistedConfig {
            last_workspace: Some(self.get_root().to_string_lossy().to_string()),
            recent_projects: self.get_recent(),
        };
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(path, serde_json::to_string_pretty(&config).unwrap_or_default());
    }
}
