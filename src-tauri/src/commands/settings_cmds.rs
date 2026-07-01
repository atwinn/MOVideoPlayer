use tauri::State;

use crate::persistence::AppSettings;
use crate::state::AppState;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    Ok(state.persistence.snapshot().await)
}

#[tauri::command]
pub async fn set_settings(state: State<'_, AppState>, settings: AppSettings) -> Result<(), String> {
    state.persistence.replace(settings).await;
    state.persistence.save().await.map_err(|e| e.to_string())
}
