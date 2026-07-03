//! Newline-delimited JSON client for mpv's `--input-ipc-server` protocol.
//!
//! Windows named pipes are the only transport we support (this app targets
//! Windows only), so the real implementation is gated behind
//! `cfg(target_os = "windows")`. The `not(windows)` stub exists purely so
//! `cargo check` on a macOS dev machine can typecheck everything that calls
//! into this module — it errors at runtime if ever invoked.

use std::collections::HashMap;
use std::fmt;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use serde_json::Value;
use tokio::sync::{broadcast, oneshot, Mutex};

use super::protocol::{MpvEvent, MpvRequest, MpvResponse};

const COMMAND_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(15);

#[derive(Debug)]
pub enum IpcError {
    Io(std::io::Error),
    Mpv(String),
    Closed,
    Unsupported,
    /// mpv accepted the request but never replied within
    /// `COMMAND_TIMEOUT`. Previously this hung the caller forever with no
    /// visible symptom other than "nothing happens" in the UI.
    Timeout,
}

impl fmt::Display for IpcError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IpcError::Io(e) => write!(f, "mpv IPC I/O error: {e}"),
            IpcError::Mpv(msg) => write!(f, "mpv error: {msg}"),
            IpcError::Closed => write!(f, "mpv IPC channel closed"),
            IpcError::Unsupported => write!(f, "mpv IPC is only supported on Windows"),
            IpcError::Timeout => write!(f, "mpv did not reply within {COMMAND_TIMEOUT:?}"),
        }
    }
}

impl std::error::Error for IpcError {}

impl From<std::io::Error> for IpcError {
    fn from(e: std::io::Error) -> Self {
        IpcError::Io(e)
    }
}

impl From<IpcError> for String {
    fn from(e: IpcError) -> Self {
        e.to_string()
    }
}

const EVENT_CHANNEL_CAPACITY: usize = 256;

pub struct MpvIpcClient {
    inner: Inner,
}

struct Inner {
    #[cfg(target_os = "windows")]
    writer: Mutex<windows_impl::PipeWriteHalf>,
    pending: Mutex<HashMap<u64, oneshot::Sender<MpvResponse>>>,
    event_tx: broadcast::Sender<MpvEvent>,
    next_request_id: AtomicU64,
}

impl MpvIpcClient {
    #[cfg(target_os = "windows")]
    pub async fn connect(pipe_name: &str) -> Result<Arc<Self>, IpcError> {
        let (reader, writer) = windows_impl::connect(pipe_name).await?;

        let (event_tx, _) = broadcast::channel(EVENT_CHANNEL_CAPACITY);
        let client = Arc::new(MpvIpcClient {
            inner: Inner {
                writer: Mutex::new(writer),
                pending: Mutex::new(HashMap::new()),
                event_tx,
                next_request_id: AtomicU64::new(1),
            },
        });

        windows_impl::spawn_read_loop(Arc::clone(&client), reader);
        Ok(client)
    }

    #[cfg(not(target_os = "windows"))]
    pub async fn connect(_pipe_name: &str) -> Result<Arc<Self>, IpcError> {
        Err(IpcError::Unsupported)
    }

    pub async fn command(&self, command: Vec<Value>) -> Result<Value, IpcError> {
        let request_id = self.inner.next_request_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = oneshot::channel();
        self.inner.pending.lock().await.insert(request_id, tx);

        let request = MpvRequest {
            command,
            request_id,
        };
        let mut line = serde_json::to_vec(&request).map_err(|e| IpcError::Mpv(e.to_string()))?;
        line.push(b'\n');

        tracing::debug!("mpv ipc -> {}", String::from_utf8_lossy(&line).trim_end());
        self.write_line(&line).await?;

        let response = match tokio::time::timeout(COMMAND_TIMEOUT, rx).await {
            Ok(Ok(response)) => response,
            Ok(Err(_)) => return Err(IpcError::Closed),
            Err(_) => {
                self.inner.pending.lock().await.remove(&request_id);
                tracing::error!("mpv ipc command timed out (request_id={request_id})");
                return Err(IpcError::Timeout);
            }
        };
        tracing::debug!("mpv ipc <- (reply to {request_id}) error={} data={:?}", response.error, response.data);
        if response.error != "success" {
            return Err(IpcError::Mpv(response.error));
        }
        Ok(response.data.unwrap_or(Value::Null))
    }

    pub async fn set_property(&self, name: &str, value: Value) -> Result<(), IpcError> {
        self.command(vec![
            Value::String("set_property".into()),
            Value::String(name.into()),
            value,
        ])
        .await?;
        Ok(())
    }

    pub async fn get_property(&self, name: &str) -> Result<Value, IpcError> {
        self.command(vec![
            Value::String("get_property".into()),
            Value::String(name.into()),
        ])
        .await
    }

    pub async fn observe_property(&self, id: u64, name: &str) -> Result<(), IpcError> {
        self.command(vec![
            Value::String("observe_property".into()),
            Value::from(id),
            Value::String(name.into()),
        ])
        .await?;
        Ok(())
    }

    pub fn subscribe_events(&self) -> broadcast::Receiver<MpvEvent> {
        self.inner.event_tx.subscribe()
    }

    #[cfg(target_os = "windows")]
    async fn write_line(&self, line: &[u8]) -> Result<(), IpcError> {
        use tokio::io::AsyncWriteExt;
        let mut writer = self.inner.writer.lock().await;
        writer.write_all(line).await?;
        writer.flush().await?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    async fn write_line(&self, _line: &[u8]) -> Result<(), IpcError> {
        Err(IpcError::Unsupported)
    }
}

#[cfg(target_os = "windows")]
mod windows_impl {
    use std::sync::Arc;
    use std::time::Duration;

    use tokio::io::{AsyncBufReadExt, BufReader};
    use tokio::net::windows::named_pipe::{ClientOptions, NamedPipeClient};
    use tokio::time::sleep;

    use super::{IpcError, MpvIpcClient, MpvResponse};
    use crate::mpv::protocol::MpvEvent;

    pub type PipeWriteHalf = tokio::io::WriteHalf<NamedPipeClient>;
    pub type PipeReadHalf = tokio::io::ReadHalf<NamedPipeClient>;

    /// mpv creates the pipe server asynchronously after startup; retry the
    /// connect for a few seconds instead of failing on the first attempt.
    pub async fn connect(pipe_name: &str) -> Result<(PipeReadHalf, PipeWriteHalf), IpcError> {
        const MAX_ATTEMPTS: u32 = 50;
        const RETRY_DELAY: Duration = Duration::from_millis(100);

        let mut last_err = None;
        for _ in 0..MAX_ATTEMPTS {
            match ClientOptions::new().open(pipe_name) {
                Ok(client) => {
                    let (read, write) = tokio::io::split(client);
                    return Ok((read, write));
                }
                Err(e) => {
                    last_err = Some(e);
                    sleep(RETRY_DELAY).await;
                }
            }
        }
        Err(IpcError::Io(last_err.unwrap()))
    }

    pub fn spawn_read_loop(client: Arc<MpvIpcClient>, reader: PipeReadHalf) {
        tokio::spawn(async move {
            let mut lines = BufReader::new(reader).lines();
            loop {
                match lines.next_line().await {
                    Ok(Some(line)) => handle_line(&client, &line),
                    Ok(None) => {
                        tracing::warn!("mpv ipc read loop: pipe closed (EOF)");
                        break;
                    }
                    Err(e) => {
                        tracing::warn!("mpv ipc read loop: read error: {e}");
                        break;
                    }
                }
            }
            // Pipe closed (mpv exited or crashed) — wake up anyone still
            // waiting on a response so they don't hang forever.
            let mut pending = client.inner.pending.lock().await;
            pending.clear();
        });
    }

    fn handle_line(client: &Arc<MpvIpcClient>, line: &str) {
        tracing::debug!("mpv ipc <- raw: {line}");
        let Ok(value) = serde_json::from_str::<serde_json::Value>(line) else {
            tracing::warn!("mpv ipc: failed to parse line as JSON: {line}");
            return;
        };

        if value.get("event").is_some() {
            match serde_json::from_value::<MpvEvent>(value) {
                Ok(event) => {
                    let _ = client.inner.event_tx.send(event);
                }
                // Previously silent — a shape mismatch here (e.g. a field
                // missing on the wire that our struct assumed was always
                // present) meant that class of mpv event just vanished
                // with no trace, forever, with nothing in the logs to
                // point at it.
                Err(e) => tracing::warn!("mpv ipc: failed to deserialize event: {e}; line={line}"),
            }
            return;
        }

        if let Ok(response) = serde_json::from_value::<MpvResponse>(value) {
            if let Some(request_id) = response.request_id {
                let client = Arc::clone(client);
                tokio::spawn(async move {
                    if let Some(tx) = client.inner.pending.lock().await.remove(&request_id) {
                        let _ = tx.send(response);
                    }
                });
            }
        }
    }
}
