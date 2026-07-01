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
