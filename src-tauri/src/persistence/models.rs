use std::collections::HashMap;

use serde::{Deserialize, Serialize};

pub const RESUME_HISTORY_CAP: usize = 200;
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeEntry {
    pub file_path: String,
    pub position_secs: f64,
    pub audio_track_id: Option<i64>,
    pub sub_track_id: Option<i64>,
    pub zoom: f64,
    pub speed: f64,
    /// Opaque, lexicographically-sortable recency token (zero-padded epoch
    /// seconds) used for LRU pruning when the resume map exceeds
    /// `RESUME_HISTORY_CAP`. Not a display timestamp.
    pub last_played_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    pub resume_playback: bool,
    pub preferred_audio_language: Option<String>,
    pub preferred_subtitle_language: Option<String>,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            resume_playback: true,
            preferred_audio_language: None,
            preferred_subtitle_language: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackSettings {
    pub default_speed: f64,
    pub remember_speed: bool,
    pub volume: f64,
}

impl Default for PlaybackSettings {
    fn default() -> Self {
        Self {
            default_speed: 1.0,
            remember_speed: true,
            volume: 100.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceSettings {
    pub overlay_hide_timeout_ms: u32,
    pub theme: String,
}

impl Default for InterfaceSettings {
    fn default() -> Self {
        Self {
            overlay_hide_timeout_ms: 500,
            theme: "system".into(),
        }
    }
}

/// Mirrors src/lib/shortcuts/registry.ts's ShortcutBinding — `action` is
/// an opaque string on this side (the frontend owns the ActionId union
/// and validates it), we just persist and round-trip it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutBinding {
    pub keys: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SubtitleProviderSettings {
    pub opensubtitles_api_key: Option<String>,
    pub subdl_api_key: Option<String>,
    pub subsource_api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WindowGeometry {
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub schema_version: u32,
    pub general: GeneralSettings,
    pub playback: PlaybackSettings,
    pub interface: InterfaceSettings,
    pub window: WindowGeometry,
    /// Keyed by `blake3(path + size + mtime)` — see `persistence::store::file_identity`.
    pub resume: HashMap<String, ResumeEntry>,
    /// Empty means "use the frontend's hardcoded defaults" (registry.ts's
    /// defaultBindings) — only populated once the user customizes a key.
    /// `#[serde(default)]` so settings.json files saved before this field
    /// existed still deserialize instead of failing to load entirely.
    #[serde(default)]
    pub shortcuts: Vec<ShortcutBinding>,
    #[serde(default)]
    pub subtitle_providers: SubtitleProviderSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            general: GeneralSettings::default(),
            playback: PlaybackSettings::default(),
            interface: InterfaceSettings::default(),
            window: WindowGeometry {
                width: 1280.0,
                height: 800.0,
                x: None,
                y: None,
            },
            resume: HashMap::new(),
            shortcuts: Vec::new(),
            subtitle_providers: SubtitleProviderSettings::default(),
        }
    }
}
