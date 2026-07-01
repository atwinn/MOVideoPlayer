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
}

struct Session {
    #[cfg(target_os = "windows")]
    child: tokio::process::Child,
    ipc: Arc<MpvIpcClient>,
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
        let session = self.spawn_session().await?;
        *self.session.write().await = Some(session);
        self.spawn_supervisor();
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    pub async fn start(self: &Arc<Self>) -> Result<(), IpcError> {
        Err(IpcError::Unsupported)
    }

    #[cfg(target_os = "windows")]
    async fn spawn_session(&self) -> Result<Session, IpcError> {
        use tokio::process::Command;

        let pipe_name = format!(r"\\.\pipe\{}", self.pipe_id);
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
            .kill_on_drop(true)
            .spawn()
            .map_err(IpcError::Io)?;

        let ipc = MpvIpcClient::connect(&pipe_name).await?;
        for (id, name) in OBSERVED_PROPERTIES.iter().enumerate() {
            ipc.observe_property(id as u64, name).await?;
        }

        Ok(Session { child, ipc })
    }

    #[cfg(target_os = "windows")]
    fn spawn_supervisor(self: &Arc<Self>) {
        let controller = Arc::clone(self);
        tokio::spawn(async move {
            loop {
                let exit_status = {
                    let mut session = controller.session.write().await;
                    match session.as_mut() {
                        Some(s) => s.child.wait().await,
                        None => return,
                    }
                };
                if exit_status.is_err() {
                    return;
                }
                let _ = controller.controller_tx.send(ControllerEvent::Crashed);

                let mut respawned = false;
                for _ in 0..MAX_RESPAWN_ATTEMPTS {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    if let Ok(new_session) = controller.spawn_session().await {
                        *controller.session.write().await = Some(new_session);
                        controller.restore_last_file().await;
                        let _ = controller.controller_tx.send(ControllerEvent::Respawned);
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

    #[cfg(target_os = "windows")]
    pub async fn pid(&self) -> Option<u32> {
        self.session.read().await.as_ref().and_then(|s| s.child.id())
    }

    #[cfg(not(target_os = "windows"))]
    pub async fn pid(&self) -> Option<u32> {
        None
    }

    pub async fn remember_file(&self, path: &str) {
        *self.last_file.write().await = Some(path.to_string());
    }
}
