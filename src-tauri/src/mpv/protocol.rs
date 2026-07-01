use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct MpvRequest {
    pub command: Vec<Value>,
    pub request_id: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MpvResponse {
    pub error: String,
    #[serde(default)]
    pub data: Option<Value>,
    #[serde(default)]
    pub request_id: Option<u64>,
}

/// mpv JSON IPC events we observe. `Other` absorbs every event type we don't
/// act on individually so unknown/future mpv events never fail deserialization.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event")]
pub enum MpvEvent {
    #[serde(rename = "property-change")]
    PropertyChange {
        id: u64,
        name: String,
        #[serde(default)]
        data: Option<Value>,
    },
    #[serde(rename = "file-loaded")]
    FileLoaded,
    #[serde(rename = "end-file")]
    EndFile { reason: String },
    #[serde(rename = "seek")]
    Seek,
    #[serde(rename = "playback-restart")]
    PlaybackRestart,
    #[serde(other)]
    Other,
}

/// The properties we subscribe to at startup via `observe_property`, in
/// binding-id order — the id doubles as the index into this list.
pub const OBSERVED_PROPERTIES: &[&str] = &[
    "time-pos",
    "duration",
    "pause",
    "volume",
    "mute",
    "speed",
    "track-list",
    "chapter-list",
    "eof-reached",
    "demuxer-cache-time",
];
