use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String,
    pub private_key_path: Option<String>,
    pub password: Option<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHSession {
    pub connection_id: String,
    pub status: String,
    pub last_error: Option<String>,
    pub connected_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHConfigHost {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub identity_file: Option<String>,
}

pub struct SSHManager {
    connections: Mutex<HashMap<String, SSHConnection>>,
    active_session: Mutex<Option<ActiveSession>>,
}

pub struct ActiveSession {
    pub connection_id: String,
    pub connection: SSHConnection,
    pub working_dir: Option<String>,  // 当前工作目录
}

impl SSHManager {
    /// 获取活跃 SSH 会话的信息（用于 PTY 启动 SSH 终端）
    pub fn get_active_session_info(&self) -> Option<(String, u16, String, Option<String>)> {
        let session = self.active_session.lock().ok()?;
        session.as_ref().map(|s| {
            (
                s.connection.host.clone(),
                s.connection.port,
                s.connection.username.clone(),
                s.connection.private_key_path.clone(),
            )
        })
    }

    /// 获取当前工作目录
    pub fn get_working_dir(&self) -> Option<String> {
        let session = self.active_session.lock().ok()?;
        session.as_ref().and_then(|s| s.working_dir.clone())
    }

    /// 设置当前工作目录
    pub fn set_working_dir(&self, dir: String) -> Result<(), String> {
        let mut session = self.active_session.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut s) = *session {
            s.working_dir = Some(dir);
            Ok(())
        } else {
            Err("No active SSH session".to_string())
        }
    }
}

impl SSHManager {
    pub fn new() -> Self {
        let mut connections = HashMap::new();

        // 加载 ~/.ssh/config 中的连接
        if let Some(hosts) = parse_ssh_config() {
            for host in hosts {
                let id = format!("config-{}", host.name);
                connections.insert(
                    id.clone(),
                    SSHConnection {
                        id,
                        name: host.name,
                        host: host.host,
                        port: host.port,
                        username: host.username,
                        auth_type: "auto".to_string(),
                        private_key_path: host.identity_file,
                        password: None,
                        source: "config".to_string(),
                    },
                );
            }
        }

        SSHManager {
            connections: Mutex::new(connections),
            active_session: Mutex::new(None),
        }
    }
}

impl Default for SSHManager {
    fn default() -> Self {
        Self::new()
    }
}

fn parse_ssh_config() -> Option<Vec<SSHConfigHost>> {
    let home = dirs::home_dir()?;
    let config_path = home.join(".ssh").join("config");

    if !config_path.exists() {
        return None;
    }

    let content = fs::read_to_string(&config_path).ok()?;
    let mut hosts = Vec::new();
    let mut current: Option<SSHConfigHost> = None;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let (key, value) = if line.contains('=') {
            let parts: Vec<&str> = line.splitn(2, '=').collect();
            if parts.len() != 2 {
                continue;
            }
            (parts[0].trim().to_lowercase(), parts[1].trim())
        } else {
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            if parts.len() != 2 {
                continue;
            }
            (parts[0].to_lowercase(), parts[1].trim())
        };

        let value = value.trim_matches('"').trim_matches('\'');

        match key.as_str() {
            "host" => {
                if value != "*" {
                    if let Some(host) = current.take() {
                        hosts.push(host);
                    }
                    current = Some(SSHConfigHost {
                        name: value.to_string(),
                        host: value.to_string(),
                        port: 22,
                        username: whoami::username(),
                        identity_file: None,
                    });
                }
            }
            "hostname" => {
                if let Some(ref mut host) = current {
                    host.host = value.to_string();
                }
            }
            "port" => {
                if let Some(ref mut host) = current {
                    host.port = value.parse().unwrap_or(22);
                }
            }
            "user" => {
                if let Some(ref mut host) = current {
                    host.username = value.to_string();
                }
            }
            "identityfile" => {
                if let Some(ref mut host) = current {
                    host.identity_file = Some(value.to_string());
                }
            }
            _ => {}
        }
    }

    if let Some(host) = current {
        hosts.push(host);
    }

    Some(hosts)
}

fn build_ssh_args(conn: &SSHConnection, command: Option<&str>) -> Vec<String> {
    let mut args = Vec::new();

    // 端口
    args.push("-p".to_string());
    args.push(conn.port.to_string());

    // 严格主机检查关闭（可选）
    args.push("-o".to_string());
    args.push("StrictHostKeyChecking=accept-new".to_string());

    // 连接超时
    args.push("-o".to_string());
    args.push("ConnectTimeout=30".to_string());

    // 批处理模式：只有明确使用密钥认证时才启用
    // auto 类型让 SSH 自己尝试所有认证方式（密钥、密码等）
    if conn.auth_type == "key" {
        args.push("-o".to_string());
        args.push("BatchMode=yes".to_string());
    }

    // 私钥文件
    if let Some(ref key_path) = conn.private_key_path {
        args.push("-i".to_string());
        args.push(key_path.clone());
    }

    // 用户@主机
    args.push(format!("{}@{}", conn.username, conn.host));

    // 命令
    if let Some(cmd) = command {
        args.push(cmd.to_string());
    }

    args
}

fn run_ssh_command(conn: &SSHConnection, command: &str, input: Option<&str>) -> Result<String, String> {
    let args = build_ssh_args(conn, Some(command));

    let mut child = Command::new("ssh")
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("无法启动 SSH: {}", e))?;

    // 如果有输入，写入 stdin
    if let Some(data) = input {
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(data.as_bytes())
                .map_err(|e| format!("写入失败: {}", e))?;
        }
    }

    let output = child.wait_with_output()
        .map_err(|e| format!("执行失败: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(if stderr.is_empty() {
            "命令执行失败".to_string()
        } else {
            stderr
        })
    }
}

// ===== Tauri Commands =====

#[tauri::command]
pub fn ssh_get_connections(manager: State<'_, SSHManager>) -> Result<Vec<SSHConnection>, String> {
    let connections = manager.connections.lock().map_err(|e| e.to_string())?;
    let mut result: Vec<SSHConnection> = connections.values().cloned().collect();

    for conn in &mut result {
        if conn.password.is_some() {
            conn.password = Some("••••••••".to_string());
        }
    }

    result.sort_by(|a, b| {
        let a_order = if a.source == "config" { 0 } else { 1 };
        let b_order = if b.source == "config" { 0 } else { 1 };
        a_order.cmp(&b_order).then(a.name.cmp(&b.name))
    });

    Ok(result)
}

#[tauri::command]
pub fn ssh_add_connection(
    manager: State<'_, SSHManager>,
    name: String,
    host: String,
    port: Option<u16>,
    username: String,
    auth_type: String,
    private_key_path: Option<String>,
    password: Option<String>,
) -> Result<SSHConnection, String> {
    let id = format!("manual-{}", chrono::Utc::now().timestamp_millis());
    let conn = SSHConnection {
        id: id.clone(),
        name,
        host,
        port: port.unwrap_or(22),
        username,
        auth_type,
        private_key_path,
        password,
        source: "manual".to_string(),
    };

    let mut connections = manager.connections.lock().map_err(|e| e.to_string())?;
    connections.insert(id, conn.clone());
    save_manual_connections(&connections);

    Ok(conn)
}

#[tauri::command]
pub fn ssh_update_connection(
    manager: State<'_, SSHManager>,
    id: String,
    name: Option<String>,
    host: Option<String>,
    port: Option<u16>,
    username: Option<String>,
    auth_type: Option<String>,
    private_key_path: Option<String>,
    password: Option<String>,
) -> Result<SSHConnection, String> {
    let mut connections = manager.connections.lock().map_err(|e| e.to_string())?;

    let conn = connections.get_mut(&id).ok_or("Connection not found")?;
    if conn.source != "manual" {
        return Err("Cannot modify config-based connection".to_string());
    }

    if let Some(n) = name { conn.name = n; }
    if let Some(h) = host { conn.host = h; }
    if let Some(p) = port { conn.port = p; }
    if let Some(u) = username { conn.username = u; }
    if let Some(a) = auth_type { conn.auth_type = a; }
    if private_key_path.is_some() { conn.private_key_path = private_key_path; }
    if password.is_some() { conn.password = password; }

    let updated = conn.clone();
    save_manual_connections(&connections);

    Ok(updated)
}

#[tauri::command]
pub fn ssh_delete_connection(manager: State<'_, SSHManager>, id: String) -> Result<(), String> {
    let mut connections = manager.connections.lock().map_err(|e| e.to_string())?;

    let conn = connections.get(&id).ok_or("Connection not found")?;
    if conn.source != "manual" {
        return Err("Cannot delete config-based connection".to_string());
    }

    connections.remove(&id);
    save_manual_connections(&connections);

    Ok(())
}

#[tauri::command]
pub fn ssh_connect(manager: State<'_, SSHManager>, id: String) -> Result<SSHSession, String> {
    let connections = manager.connections.lock().map_err(|e| e.to_string())?;
    let conn = connections.get(&id).ok_or("Connection not found")?.clone();
    drop(connections);

    // 断开现有连接
    {
        let mut session = manager.active_session.lock().map_err(|e| e.to_string())?;
        *session = None;
    }

    // 测试连接并获取用户主目录
    let home_dir = run_ssh_command(&conn, "echo $HOME", None)
        .map_err(|e| format!("连接失败: {}", e))?;
    let home_dir = home_dir.trim().to_string();

    // 保存会话
    {
        let mut session = manager.active_session.lock().map_err(|e| e.to_string())?;
        *session = Some(ActiveSession {
            connection_id: id.clone(),
            connection: conn,
            working_dir: Some(home_dir),
        });
    }

    Ok(SSHSession {
        connection_id: id,
        status: "connected".to_string(),
        last_error: None,
        connected_at: Some(chrono::Utc::now().to_rfc3339()),
    })
}

#[tauri::command]
pub fn ssh_connect_with_password(
    manager: State<'_, SSHManager>,
    id: String,
    password: String,
) -> Result<SSHSession, String> {
    let connections = manager.connections.lock().map_err(|e| e.to_string())?;
    let mut conn = connections.get(&id).ok_or("Connection not found")?.clone();
    drop(connections);

    // 设置密码认证
    conn.auth_type = "password".to_string();
    conn.password = Some(password);

    // 断开现有连接
    {
        let mut session = manager.active_session.lock().map_err(|e| e.to_string())?;
        *session = None;
    }

    // 使用 sshpass 进行密码认证
    let output = Command::new("sshpass")
        .arg("-p")
        .arg(conn.password.as_ref().unwrap())
        .arg("ssh")
        .args(&build_ssh_args(&conn, Some("echo 'SSH_CONNECTION_TEST_OK'")))
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "需要安装 sshpass 来支持密码认证。在 Windows 上可以使用: scoop install sshpass 或使用私钥认证".to_string()
            } else {
                format!("执行失败: {}", e)
            }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(if stderr.is_empty() {
            "密码认证失败".to_string()
        } else {
            format!("密码认证失败: {}", stderr)
        });
    }

    // 保存会话（获取主目录）
    let home_output = Command::new("sshpass")
        .arg("-p")
        .arg(conn.password.as_ref().unwrap())
        .arg("ssh")
        .args(&build_ssh_args(&conn, Some("echo $HOME")))
        .output()
        .map_err(|e| format!("获取主目录失败: {}", e))?;

    let home_dir = String::from_utf8_lossy(&home_output.stdout).trim().to_string();

    {
        let mut session = manager.active_session.lock().map_err(|e| e.to_string())?;
        *session = Some(ActiveSession {
            connection_id: id.clone(),
            connection: conn,
            working_dir: Some(home_dir),
        });
    }

    Ok(SSHSession {
        connection_id: id,
        status: "connected".to_string(),
        last_error: None,
        connected_at: Some(chrono::Utc::now().to_rfc3339()),
    })
}

#[tauri::command]
pub fn ssh_disconnect(manager: State<'_, SSHManager>) -> Result<(), String> {
    let mut session = manager.active_session.lock().map_err(|e| e.to_string())?;
    *session = None;
    Ok(())
}

#[tauri::command]
pub fn ssh_get_session(manager: State<'_, SSHManager>) -> Result<Option<SSHSession>, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    Ok(session.as_ref().map(|s| SSHSession {
        connection_id: s.connection_id.clone(),
        status: "connected".to_string(),
        last_error: None,
        connected_at: None,
    }))
}

#[tauri::command]
pub fn ssh_get_file_tree(
    manager: State<'_, SSHManager>,
    dir: Option<String>,
) -> Result<Vec<FileNode>, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;

    // 使用绝对路径，默认为根目录
    let path = match dir {
        Some(ref p) if !p.is_empty() => {
            if p.starts_with('/') {
                p.clone()
            } else {
                format!("/{}", p)
            }
        }
        _ => "/".to_string(),
    };

    // 使用 ls 命令获取文件列表，使用 find 处理文件名中的空格
    let cmd = format!(
        "ls -la '{}' 2>/dev/null | tail -n +2",
        path.replace("'", "'\\''")
    );
    let output = run_ssh_command(&active.connection, &cmd, None)?;

    let mut nodes = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        let is_dir = parts[0].starts_with('d');
        let name = parts[8..].join(" ");

        // 跳过 . 和 ..
        if name == "." || name == ".." {
            continue;
        }

        // 构建完整路径（始终使用绝对路径）
        let full_path = format!("{}/{}", path.trim_end_matches('/'), name);

        nodes.push(FileNode {
            name,
            path: full_path,
            is_directory: is_dir,
            children: if is_dir { Some(vec![]) } else { None },
        });
    }

    // 排序：文件夹优先
    nodes.sort_by(|a, b| {
        if a.is_directory && !b.is_directory {
            std::cmp::Ordering::Less
        } else if !a.is_directory && b.is_directory {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });

    Ok(nodes)
}

#[tauri::command]
pub fn ssh_read_file(manager: State<'_, SSHManager>, path: String) -> Result<String, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;

    let cmd = format!("cat '{}'", path.replace("'", "'\\''"));
    run_ssh_command(&active.connection, &cmd, None)
}

#[tauri::command]
pub fn ssh_write_file(
    manager: State<'_, SSHManager>,
    path: String,
    content: String,
) -> Result<(), String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;

    let cmd = format!("cat > '{}'", path.replace("'", "'\\''"));
    run_ssh_command(&active.connection, &cmd, Some(&content))?;

    Ok(())
}

fn save_manual_connections(connections: &HashMap<String, SSHConnection>) {
    let manual: Vec<&SSHConnection> = connections
        .values()
        .filter(|c| c.source == "manual")
        .collect();

    if let Some(config_dir) = dirs::config_dir() {
        let app_dir = config_dir.join("openloom");
        if let Err(e) = fs::create_dir_all(&app_dir) {
            eprintln!("Failed to create config dir: {}", e);
            return;
        }

        let config_file = app_dir.join("ssh-connections.json");
        if let Err(e) = fs::write(&config_file, serde_json::to_string_pretty(&manual).unwrap()) {
            eprintln!("Failed to save connections: {}", e);
        }
    }
}

// ===== 工作目录 =====

#[tauri::command]
pub fn ssh_get_working_dir(manager: State<'_, SSHManager>) -> Result<Option<String>, String> {
    Ok(manager.get_working_dir())
}

#[tauri::command]
pub fn ssh_set_working_dir(manager: State<'_, SSHManager>, dir: String) -> Result<(), String> {
    manager.set_working_dir(dir)
}

// ===== SSH Git 命令 =====

#[tauri::command]
pub fn ssh_git_status(manager: State<'_, SSHManager>) -> Result<String, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;
    let working_dir = active.working_dir.as_ref().ok_or("No working directory set")?;

    let cmd = format!("cd '{}' && git status --porcelain", working_dir.replace("'", "'\\''"));
    run_ssh_command(&active.connection, &cmd, None)
}

#[tauri::command]
pub fn ssh_git_log(manager: State<'_, SSHManager>) -> Result<String, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;
    let working_dir = active.working_dir.as_ref().ok_or("No working directory set")?;

    let cmd = format!(
        "cd '{}' && git log --oneline -50 --pretty=format:'%H|%h|%s|%an|%ar'",
        working_dir.replace("'", "'\\''")
    );
    run_ssh_command(&active.connection, &cmd, None)
}

#[tauri::command]
pub fn ssh_git_branches(manager: State<'_, SSHManager>) -> Result<String, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;
    let working_dir = active.working_dir.as_ref().ok_or("No working directory set")?;

    let cmd = format!("cd '{}' && git branch -a", working_dir.replace("'", "'\\''"));
    run_ssh_command(&active.connection, &cmd, None)
}

#[tauri::command]
pub fn ssh_git_stage(manager: State<'_, SSHManager>, paths: Vec<String>) -> Result<String, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;
    let working_dir = active.working_dir.as_ref().ok_or("No working directory set")?;

    let files: String = paths.iter().map(|p| format!("'{}'", p.replace("'", "'\\''"))).collect::<Vec<_>>().join(" ");
    let cmd = format!("cd '{}' && git add {}", working_dir.replace("'", "'\\''"), files);
    run_ssh_command(&active.connection, &cmd, None)
}

#[tauri::command]
pub fn ssh_git_commit(manager: State<'_, SSHManager>, message: String) -> Result<String, String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;
    let working_dir = active.working_dir.as_ref().ok_or("No working directory set")?;

    let cmd = format!(
        "cd '{}' && git commit -m '{}'",
        working_dir.replace("'", "'\\''"),
        message.replace("'", "'\\''")
    );
    run_ssh_command(&active.connection, &cmd, None)
}

// ===== SSH 文件操作 =====

#[tauri::command]
pub fn ssh_create_dir(manager: State<'_, SSHManager>, path: String) -> Result<(), String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;

    let cmd = format!("mkdir -p '{}'", path.replace("'", "'\\''"));
    run_ssh_command(&active.connection, &cmd, None)?;
    Ok(())
}

#[tauri::command]
pub fn ssh_delete_file(manager: State<'_, SSHManager>, path: String) -> Result<(), String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;

    let cmd = format!("rm -f '{}'", path.replace("'", "'\\''"));
    run_ssh_command(&active.connection, &cmd, None)?;
    Ok(())
}

#[tauri::command]
pub fn ssh_delete_dir(manager: State<'_, SSHManager>, path: String) -> Result<(), String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;

    let cmd = format!("rm -rf '{}'", path.replace("'", "'\\''"));
    run_ssh_command(&active.connection, &cmd, None)?;
    Ok(())
}

#[tauri::command]
pub fn ssh_rename(
    manager: State<'_, SSHManager>,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    let session = manager.active_session.lock().map_err(|e| e.to_string())?;
    let active = session.as_ref().ok_or("No active SSH connection")?;

    let cmd = format!(
        "mv '{}' '{}'",
        old_path.replace("'", "'\\''"),
        new_path.replace("'", "'\\''")
    );
    run_ssh_command(&active.connection, &cmd, None)?;
    Ok(())
}
