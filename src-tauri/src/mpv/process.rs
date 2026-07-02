//! Spawns and supervises the bundled mpv.exe subprocess. Windows-only: mpv
//! is embedded via `--wid` (a native HWND, see `window::embed`) and
//! controlled exclusively over the named-pipe JSON IPC client in `ipc.rs`.

use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::{broadcast, RwLock};

use super::ipc::{IpcError, MpvIpcClient};
use super::protocol::MpvEvent;
#[cfg(target_os = "windows")]
use super::protocol::OBSERVED_PROPERTIES;

const MAX_RESPAWN_ATTEMPTS: u32 = 3;

/// Emitted alongside raw mpv events so the frontend can distinguish
/// "mpv told us something" from "mpv died and we're recovering."
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "kind", content = "payload")]
pub enum ControllerEvent {
    Mpv(MpvEvent),
    Crashed,
    Respawned,
    RespawnFailed,
    /// mpv never came up at all (bad binary path, spawn failure, IPC
    /// connect timeout...). Distinct from `Crashed`, which implies it was
    /// running first. Without this, a failed startup is invisible to the
    /// user — the release build has no console attached, so `tracing`
    /// output goes nowhere anyone can see.
    StartFailed(String),
}

struct Session {
    ipc: Arc<MpvIpcClient>,
    pid: Option<u32>,
}

pub struct MpvController {
    mpv_binary: PathBuf,
    hwnd: isize,
    pipe_id: String,
    session: RwLock<Option<Session>>,
    controller_tx: broadcast::Sender<ControllerEvent>,
    last_file: RwLock<Option<String>>,
    last_position: RwLock<f64>,
}

impl MpvController {
    pub fn new(mpv_binary: PathBuf, hwnd: isize) -> Arc<Self> {
        let (controller_tx, _) = broadcast::channel(256);
        Arc::new(Self {
            mpv_binary,
            hwnd,
            pipe_id: format!("movp-{}", uuid::Uuid::new_v4()),
            session: RwLock::new(None),
            controller_tx,
            last_file: RwLock::new(None),
            last_position: RwLock::new(0.0),
        })
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ControllerEvent> {
        self.controller_tx.subscribe()
    }

    #[cfg(target_os = "windows")]
    pub async fn start(self: &Arc<Self>) -> Result<(), IpcError> {
        let (session, child) = self.spawn_session().await?;
        *self.session.write().await = Some(session);
        self.spawn_supervisor(child);
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    pub async fn start(self: &Arc<Self>) -> Result<(), IpcError> {
        Err(IpcError::Unsupported)
    }

    // Returns the raw `Child` alongside `Session` rather than storing it
    // there. `Session` lives behind a shared `RwLock` that every command
    // needs brief read access to; the supervisor task below needs to
    // `.await` the child's exit for the entire lifetime of the mpv
    // process. Combining those into one lock previously meant the
    // supervisor's `child.wait()` held the write guard for as long as mpv
    // ran, permanently starving every other reader (see spawn_supervisor).
    #[cfg(target_os = "windows")]
    async fn spawn_session(&self) -> Result<(Session, tokio::process::Child), IpcError> {
        use tokio::process::Command;

        let pipe_name = format!(r"\\.\pipe\{}", self.pipe_id);
        tracing::info!("spawning mpv: {} --wid={} --input-ipc-server={pipe_name}", self.mpv_binary.display(), self.hwnd);
        let child = Command::new(&self.mpv_binary)
            .arg(format!("--wid={}", self.hwnd))
            .arg(format!("--input-ipc-server={pipe_name}"))
            .arg("--idle=yes")
            .arg("--force-window=yes")
            .arg("--hwdec=auto-safe")
            .arg("--vo=gpu-next")
            .arg("--gpu-context=d3d11")
            .arg("--keep-open=yes")
            .arg("--no-input-default-bindings")
            .arg("--input-vo-keyboard=no")
            .arg("--osc=no")
            .arg("--osd-level=0")
            .arg("--config=no")
            // TEMPORARY diagnostic verbosity — mpv's own stderr was
            // otherwise completely silent, hiding driver/vo/decoder
            // errors. Revert to quieter logging once loadfile is fixed.
            .arg("--msg-level=all=v")
            .kill_on_drop(true)
            .spawn()
            .map_err(IpcError::Io)?;

        let pid = child.id();
        let ipc = MpvIpcClient::connect(&pipe_name).await?;
        for (id, name) in OBSERVED_PROPERTIES.iter().enumerate() {
            ipc.observe_property(id as u64, name).await?;
        }

        Ok((Session { ipc, pid }, child))
    }

    #[cfg(target_os = "windows")]
    fn spawn_supervisor(self: &Arc<Self>, initial_child: tokio::process::Child) {
        let controller = Arc::clone(self);
        tokio::spawn(async move {
            let mut child = initial_child;
            loop {
                // No lock held here — this can wait for mpv's entire
                // lifetime, and every other task (ipc(), pid(), any
                // command) needs the RwLock in the meantime.
                let exit_status = child.wait().await;
                if exit_status.is_err() {
                    return;
                }
                let _ = controller.controller_tx.send(ControllerEvent::Crashed);

                let mut respawned = false;
                for _ in 0..MAX_RESPAWN_ATTEMPTS {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    if let Ok((new_session, new_child)) = controller.spawn_session().await {
                        *controller.session.write().await = Some(new_session);
                        controller.restore_last_file().await;
                        let _ = controller.controller_tx.send(ControllerEvent::Respawned);
                        child = new_child;
                        respawned = true;
                        break;
                    }
                }
                if !respawned {
                    let _ = controller.controller_tx.send(ControllerEvent::RespawnFailed);
                    return;
                }
            }
        });

        let controller = Arc::clone(self);
        tokio::spawn(async move {
            let Some(ipc) = controller.ipc().await else { return };
            let mut events = ipc.subscribe_events();
            loop {
                match events.recv().await {
                    Ok(event) => {
                        if let MpvEvent::PropertyChange { name, data, .. } = &event {
                            if name == "time-pos" {
                                if let Some(pos) = data.as_ref().and_then(|v| v.as_f64()) {
                                    *controller.last_position.write().await = pos;
                                }
                            }
                        }
                        let _ = controller.controller_tx.send(ControllerEvent::Mpv(event));
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                }
            }
        });
    }

    async fn restore_last_file(&self) {
        let file = self.last_file.read().await.clone();
        let position = *self.last_position.read().await;
        if let (Some(file), Some(ipc)) = (file, self.ipc().await) {
            let _ = ipc
                .command(vec![
                    serde_json::Value::String("loadfile".into()),
                    serde_json::Value::String(file),
                ])
                .await;
            let _ = ipc.set_property("time-pos", position.into()).await;
        }
    }

    pub async fn ipc(&self) -> Option<Arc<MpvIpcClient>> {
        self.session.read().await.as_ref().map(|s| Arc::clone(&s.ipc))
    }

    pub async fn pid(&self) -> Option<u32> {
        self.session.read().await.as_ref().and_then(|s| s.pid)
    }

    pub async fn remember_file(&self, path: &str) {
        *self.last_file.write().await = Some(path.to_string());
    }
}
