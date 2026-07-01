use serde_json::Value;
use tauri::{Manager, State};

use super::require_ipc;
use crate::persistence::store::file_identity;
use crate::persistence::ResumeEntry;
use crate::state::AppState;

#[tauri::command]
pub async fn mpv_play(state: State<'_, AppState>) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    client.set_property("pause", Value::Bool(false)).await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_pause(state: State<'_, AppState>) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    client.set_property("pause", Value::Bool(true)).await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_toggle_play(state: State<'_, AppState>) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    let paused = client
        .get_property("pause")
        .await?
        .as_bool()
        .unwrap_or(false);
    client.set_property("pause", Value::Bool(!paused)).await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_seek(state: State<'_, AppState>, seconds: f64, relative: bool) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    let mode = if relative { "relative" } else { "absolute" };
    client
        .command(vec![
            Value::String("seek".into()),
            Value::from(seconds),
            Value::String(mode.into()),
        ])
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_set_property(
    state: State<'_, AppState>,
    name: String,
    value: Value,
) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    client.set_property(&name, value).await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_get_property(state: State<'_, AppState>, name: String) -> Result<Value, String> {
    let client = require_ipc(&state).await?;
    Ok(client.get_property(&name).await?)
}

#[tauri::command]
pub async fn mpv_set_speed(state: State<'_, AppState>, speed: f64) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    client.set_property("speed", Value::from(speed)).await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_set_volume(state: State<'_, AppState>, volume: f64) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    client.set_property("volume", Value::from(volume)).await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_toggle_mute(state: State<'_, AppState>) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    let muted = client
        .get_property("mute")
        .await?
        .as_bool()
        .unwrap_or(false);
    client.set_property("mute", Value::Bool(!muted)).await?;
    Ok(())
}

#[tauri::command]
pub async fn mpv_screenshot(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let client = require_ipc(&state).await?;
    let dir = app
        .path()
        .app_data_dir()
        .map(|d| d.join("Screenshots"))
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let filename = format!("movideoplayer-{}.png", uuid::Uuid::new_v4());
    let path = dir.join(filename);
    client
        .command(vec![
            Value::String("screenshot-to-file".into()),
            Value::String(path.to_string_lossy().into_owned()),
        ])
        .await?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn mpv_load_file(
    state: State<'_, AppState>,
    path: String,
    append: bool,
) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    let mode = if append { "append-play" } else { "replace" };
    client
        .command(vec![
            Value::String("loadfile".into()),
            Value::String(path.clone()),
            Value::String(mode.into()),
        ])
        .await?;

    if !append {
        *state.current_file.write().await = Some(path.clone());
        state.mpv.remember_file(&path).await;

        let local_path = std::path::Path::new(&path);
        if local_path.exists() {
            let file_id = file_identity(local_path);
            if let Some(entry) = state.persistence.resume_entry(&file_id).await {
                let _ = client.set_property("time-pos", Value::from(entry.position_secs)).await;
                if let Some(aid) = entry.audio_track_id {
                    let _ = client.set_property("aid", Value::from(aid)).await;
                }
                if let Some(sid) = entry.sub_track_id {
                    let _ = client.set_property("sid", Value::from(sid)).await;
                }
                let _ = client.set_property("speed", Value::from(entry.speed)).await;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn mpv_load_subtitle(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let client = require_ipc(&state).await?;
    client
        .command(vec![Value::String("sub-add".into()), Value::String(path)])
        .await?;
    Ok(())
}

/// Snapshots current playback state into a `ResumeEntry` for the active
/// file. Called on a debounce timer from the frontend and on shutdown.
#[tauri::command]
pub async fn save_resume_state(state: State<'_, AppState>) -> Result<(), String> {
    let Some(path) = state.current_file.read().await.clone() else {
        return Ok(());
    };
    let local_path = std::path::Path::new(&path);
    if !local_path.exists() {
        return Ok(());
    }
    let client = require_ipc(&state).await?;
    let position_secs = client
        .get_property("time-pos")
        .await
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let volume = client
        .get_property("volume")
        .await
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(100.0);
    let speed = client
        .get_property("speed")
        .await
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0);
    let audio_track_id = client
        .get_property("aid")
        .await
        .ok()
        .and_then(|v| v.as_i64());
    let sub_track_id = client
        .get_property("sid")
        .await
        .ok()
        .and_then(|v| v.as_i64());

    let entry = ResumeEntry {
        file_path: path.clone(),
        position_secs,
        audio_track_id,
        sub_track_id,
        volume,
        zoom: 1.0,
        speed,
        last_played_at: recency_token(),
    };
    state
        .persistence
        .upsert_resume_entry(file_identity(local_path), entry)
        .await;
    state.persistence.save().await.map_err(|e| e.to_string())
}

/// Zero-padded seconds-since-epoch, used only for LRU ordering of resume
/// entries — sorts correctly as a plain string without pulling in a date
/// library.
fn recency_token() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:020}", now.as_secs())
}
