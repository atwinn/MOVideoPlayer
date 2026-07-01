use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "mov", "avi", "webm", "flv", "ts", "mpg", "mpeg", "m3u8",
];
const SUBTITLE_EXTENSIONS: &[&str] = &["srt", "ass", "ssa", "vtt"];

#[tauri::command]
pub async fn open_video_dialog(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Video", VIDEO_EXTENSIONS)
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())
    .map(|picked| picked.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn open_subtitle_dialog(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Subtitle", SUBTITLE_EXTENSIONS)
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())
    .map(|picked| picked.map(|p| p.to_string()))
}
