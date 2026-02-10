use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

struct PtyInstance {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn Child + Send + Sync>,
}

#[derive(Clone, serde::Serialize)]
pub struct PtyOutputPayload {
    pub id: u32,
    pub data: String,
}

#[derive(Clone, serde::Serialize)]
pub struct PtyExitPayload {
    pub id: u32,
}

pub struct PtyManager {
    instances: Mutex<HashMap<u32, PtyInstance>>,
    next_id: AtomicU32,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
            next_id: AtomicU32::new(1),
        }
    }

    pub fn spawn(&self, app: AppHandle, cwd: String) -> Result<u32, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new_default_prog();
        // Windows canonicalize 产生的 \\?\ 前缀 CMD 不支持，需要去掉
        #[cfg(target_os = "windows")]
        let cwd = if let Some(stripped) = cwd.strip_prefix(r"\\?\") {
            stripped.to_string()
        } else {
            cwd
        };
        cmd.cwd(&cwd);

        // 设置终端类型，确保 readline/补全/删除键等正常工作
        cmd.env("TERM", "xterm-256color");
        // macOS 需要 UTF-8 locale 避免编码问题
        #[cfg(target_os = "macos")]
        {
            cmd.env("LANG", "en_US.UTF-8");
            cmd.env("LC_ALL", "en_US.UTF-8");
        }

        let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let instance = PtyInstance {
            writer,
            master: pair.master,
            child,
        };

        self.instances.lock().unwrap().insert(id, instance);

        // 读取线程：PTY 输出 → Tauri 事件（带 id）
        let app_clone = app.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_clone.emit("pty-output", PtyOutputPayload { id, data });
                    }
                    Err(_) => break,
                }
            }
            // PTY 进程退出
            let _ = app_clone.emit("pty-exit", PtyExitPayload { id });
        });

        Ok(id)
    }

    pub fn write_input(&self, id: u32, data: &str) -> Result<(), String> {
        let mut guard = self.instances.lock().unwrap();
        if let Some(inst) = guard.get_mut(&id) {
            inst.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
            inst.writer.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err(format!("PTY {} not found", id))
        }
    }

    pub fn resize(&self, id: u32, cols: u16, rows: u16) -> Result<(), String> {
        let guard = self.instances.lock().unwrap();
        if let Some(inst) = guard.get(&id) {
            inst.master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err(format!("PTY {} not found", id))
        }
    }

    pub fn kill(&self, id: u32) -> Result<(), String> {
        let mut guard = self.instances.lock().unwrap();
        if let Some(mut inst) = guard.remove(&id) {
            let _ = inst.child.kill();
            Ok(())
        } else {
            Err(format!("PTY {} not found", id))
        }
    }
}
