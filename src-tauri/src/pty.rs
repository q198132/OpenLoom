use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

pub struct PtyManager {
    writer: Mutex<Option<Box<dyn Write + Send>>>,
    master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    alive: Mutex<bool>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            writer: Mutex::new(None),
            master: Mutex::new(None),
            alive: Mutex::new(false),
        }
    }

    pub fn is_alive(&self) -> bool {
        *self.alive.lock().unwrap()
    }

    pub fn spawn(&self, app: AppHandle, cwd: String) -> Result<(), String> {
        if self.is_alive() {
            return Ok(());
        }

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
        cmd.cwd(&cwd);

        let _child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        *self.writer.lock().unwrap() = Some(writer);
        *self.master.lock().unwrap() = Some(pair.master);
        *self.alive.lock().unwrap() = true;

        // 读取线程：PTY 输出 → Tauri 事件
        let app_clone = app.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_clone.emit("pty-output", &data);
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(())
    }

    pub fn write_input(&self, data: &str) -> Result<(), String> {
        let mut guard = self.writer.lock().unwrap();
        if let Some(ref mut w) = *guard {
            w.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
            w.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("PTY not started".into())
        }
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        let guard = self.master.lock().unwrap();
        if let Some(ref master) = *guard {
            master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("PTY not started".into())
        }
    }
}
