use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use super::require_ipc;
use crate::state::AppState;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TrackKind {
    Audio,
    Sub,
    Video,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: i64,
    pub kind: TrackKind,
    pub title: Option<String>,
    pub lang: Option<String>,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TrackList {
    pub audio: Vec<Track>,
    pub subtitle: Vec<Track>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AspectMode {
    Auto,
    Sixteen9,
    Four3,
    TwentyOne9,
    Stretch,
}

impl AspectMode {
    fn mpv_value(self) -> Value {
        match self {
            AspectMode::Auto => Value::String("-1".into()),
            AspectMode::Sixteen9 => Value::String("16:9".into()),
            AspectMode::Four3 => Value::String("4:3".into()),
            AspectMode::TwentyOne9 => Value::String("21:9".into()),
            AspectMode::Stretch => Value::String("0".into()),
        }
    }
}

#[tauri::command]
pub async fn mpv_list_tracks(state: State<'_, AppState>) -> Result<TrackList, String> {
    let client = require_ipc(&state).await?;
    let raw = client.get_property("track-list").await?;
    let entries: Vec<Value> = serde_json::from_value(raw).unwrap_or_default();

    let mut list = TrackList::default();
    for entry in entries {
        let kind_str = entry.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let kind = match kind_str {
            "audio" => TrackKind::Audio,
            "sub" => TrackKind::Sub,
            _ => TrackKind::Video,
        };
        let track = Track {
            id: entry.get("id").and_then(|v| v.as_i64()).unwrap_or_default(),
            kind,
            title: entry.get("title").and_then(|v| v.as_str()).map(String::from),
            lang: entry.get("lang").and_then(|v| v.as_str()).map(String::from),
            selected: entry.get("selected").and_then(|v| v.as_bool()).unwrap_or(false),
        };
        match track.kind {
            TrackKind::Audio => list.audio.push(track),
            TrackKind::Sub => list.subtitle.push(track),
            TrackKind::Video => {}
        }
    }
    Ok(list)
}

#[tauri::command]
pub async fn mpv_set_track(
    state: State<'_, AppState>,
    kind: TrackKind,
    id: i64,
) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    let property = match kind {
        TrackKind::Audio => "aid",
        TrackKind::Sub => "sid",
        TrackKind::Video => "vid",
    };
    client.set_property(property, Value::from(id)).await?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VideoInfo {
    pub filename: Option<String>,
    pub container: Option<String>,
    pub video_codec: Option<String>,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub fps: Option<f64>,
    pub video_bitrate: Option<f64>,
    pub hwdec: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_channels: Option<i64>,
    pub audio_samplerate: Option<i64>,
    pub audio_bitrate: Option<f64>,
}

/// Read-only technical info for the "I" shortcut's info panel — every field
/// is best-effort (`.ok()`'d away on error) since which properties are
/// populated depends on codec/container and can briefly be "unavailable"
/// right after a file loads.
#[tauri::command]
pub async fn mpv_video_info(state: State<'_, AppState>) -> Result<VideoInfo, String> {
    let client = require_ipc(&state).await?;
    async fn get<T: serde::de::DeserializeOwned>(
        client: &crate::mpv::MpvIpcClient,
        name: &str,
    ) -> Option<T> {
        client.get_property(name).await.ok().and_then(|v| serde_json::from_value(v).ok())
    }

    Ok(VideoInfo {
        filename: get(&client, "filename").await,
        container: get(&client, "file-format").await,
        video_codec: get(&client, "video-codec").await,
        width: get(&client, "width").await,
        height: get(&client, "height").await,
        fps: get(&client, "container-fps").await,
        video_bitrate: get(&client, "video-bitrate").await,
        hwdec: get(&client, "hwdec-current").await,
        audio_codec: get(&client, "audio-codec-name").await,
        audio_channels: get(&client, "audio-params/channel-count").await,
        audio_samplerate: get(&client, "audio-params/samplerate").await,
        audio_bitrate: get(&client, "audio-bitrate").await,
    })
}

#[tauri::command]
pub async fn mpv_set_aspect(state: State<'_, AppState>, mode: AspectMode) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    if matches!(mode, AspectMode::Stretch) {
        client.set_property("panscan", Value::from(1.0)).await?;
        client.set_property("video-aspect-override", Value::from(-1)).await?;
    } else {
        client.set_property("panscan", Value::from(0.0)).await?;
        client
            .set_property("video-aspect-override", mode.mpv_value())
            .await?;
    }
    Ok(())
}

/// Toggles a labeled entry in mpv's video filter chain (`vf`) — used for
/// horizontal/vertical flip, which (unlike rotation) has no standalone
/// property in mpv and only exists as a filter.
///
/// Manipulates the `vf` *property* directly (get the current filter list,
/// remove any existing entry with this label, push a new one if enabling,
/// set it back) rather than the string-based `vf add`/`vf <op>` *command*.
/// The command form was tried first and used `"remove"` as the delete
/// operation, which doesn't exist in mpv's `vf` command (the real
/// operations are `set`/`add`/`toggle`/`del`/`clr`) — so every attempt to
/// turn a flip back off silently errored. Manipulating the property
/// directly sidesteps that whole string-operation vocabulary.
///
/// A follow-up report (with an IPC trace) showed the property update
/// itself succeeding — mpv accepted the filter, and reading `vf` back
/// confirmed `"enabled": true` — yet the video never visibly flipped.
/// `video-rotate` (a VO-level property, not a filter) was confirmed
/// working in the same report. That combination points at mpv's classic
/// hwdec limitation: `mirror`/`flip` are plain software pixel filters,
/// but frames decoded via `--hwdec=auto-safe` stay as opaque hardware
/// surfaces (e.g. D3D11 textures) that a software filter can't operate
/// on directly — mpv can hold the filter in the chain without erroring
/// while it has no visible effect on hardware-decoded frames. Forcing
/// software decoding while any flip is active sidesteps that; the
/// alternative (finding a hwdec-compatible flip mechanism) isn't
/// something to guess at blind without a way to verify it actually
/// renders differently.
#[tauri::command]
pub async fn mpv_set_video_filter(
    state: State<'_, AppState>,
    label: String,
    filter: String,
    enabled: bool,
) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    let raw = client.get_property("vf").await?;
    let mut list: Vec<Value> = serde_json::from_value(raw).unwrap_or_default();
    list.retain(|entry| entry.get("label").and_then(|v| v.as_str()) != Some(label.as_str()));
    if enabled {
        list.push(serde_json::json!({ "name": filter, "label": label }));
    }
    let any_filter_active = !list.is_empty();
    client.set_property("vf", Value::Array(list)).await?;
    client
        .set_property(
            "hwdec",
            Value::String(if any_filter_active { "no" } else { "auto-safe" }.into()),
        )
        .await?;
    Ok(())
}
