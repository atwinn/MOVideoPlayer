pub mod files;
pub mod playback;
pub mod settings_cmds;
pub mod tracks;
pub mod window_cmds;

use std::sync::Arc;

use crate::mpv::MpvIpcClient;
use crate::state::AppState;

/// Shared guard used by every playback/track command: mpv may not be
/// running yet (still spawning, or crashed and mid-respawn).
pub(crate) async fn require_ipc(state: &AppState) -> Result<Arc<MpvIpcClient>, String> {
    match state.mpv.ipc().await {
        Some(client) => Ok(client),
        None => {
            tracing::warn!("command rejected: mpv IPC session not available");
            Err("mpv is not running".to_string())
        }
    }
}
