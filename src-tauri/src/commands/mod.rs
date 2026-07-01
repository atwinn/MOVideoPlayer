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
    state
        .mpv
        .ipc()
        .await
        .ok_or_else(|| "mpv is not running".to_string())
}
