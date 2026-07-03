//! Online subtitle provider integration (OpenSubtitles, SubDL). SubSource
//! is deliberately NOT wired to a live endpoint here — unlike the other
//! two, its public API surface isn't documented clearly enough to
//! integrate against with any confidence, and guessing at endpoints would
//! just produce confusing failures instead of a working feature. The
//! settings field for its API key still exists so the UI is ready the
//! moment real endpoint details are available.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::state::AppState;

fn user_agent() -> String {
    format!("MOVideoPlayer v{}", env!("CARGO_PKG_VERSION"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleSearchResult {
    pub provider: String,
    pub language: String,
    pub release_name: String,
    /// Direct, ready-to-fetch URL for providers that expose one (SubDL).
    /// None for OpenSubtitles, which requires a second authenticated
    /// request (POST /download with file_id) to mint a temporary link —
    /// that request happens in `download_subtitle`, using `file_id`.
    pub download_url: Option<String>,
    pub file_id: Option<String>,
}

#[tauri::command]
pub async fn test_subtitle_provider_key(provider: String, api_key: String) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("Enter an API key first".into());
    }
    let client = reqwest::Client::new();
    match provider.as_str() {
        "opensubtitles" => {
            let resp = client
                .get("https://api.opensubtitles.com/api/v1/subtitles")
                .query(&[("query", "test")])
                .header("Api-Key", &api_key)
                .header("User-Agent", user_agent())
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if resp.status().is_success() {
                Ok("Key is valid".into())
            } else {
                Err(format!("HTTP {}: {}", resp.status(), resp.text().await.unwrap_or_default()))
            }
        }
        "subdl" => {
            let resp = client
                .get("https://api.subdl.com/api/v1/subtitles")
                .query(&[("api_key", api_key.as_str()), ("film_name", "test")])
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let body: Value = resp.json().await.map_err(|e| e.to_string())?;
            if body.get("status").and_then(|v| v.as_bool()).unwrap_or(false) {
                Ok("Key is valid".into())
            } else {
                Err(body
                    .get("error")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Rejected — check the key")
                    .to_string())
            }
        }
        "subsource" => Err(
            "SubSource isn't wired up to a live endpoint yet — its API isn't documented \
             clearly enough to integrate with confidence. The key is saved for when it is."
                .into(),
        ),
        other => Err(format!("Unknown provider: {other}")),
    }
}

async fn search_opensubtitles(client: &reqwest::Client, api_key: &str, query: &str) -> Vec<SubtitleSearchResult> {
    let Ok(resp) = client
        .get("https://api.opensubtitles.com/api/v1/subtitles")
        .query(&[("query", query)])
        .header("Api-Key", api_key)
        .header("User-Agent", user_agent())
        .send()
        .await
    else {
        return Vec::new();
    };
    let Ok(body) = resp.json::<Value>().await else {
        return Vec::new();
    };
    body.get("data")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let attrs = item.get("attributes")?;
                    let file_id = attrs.get("files")?.as_array()?.first()?.get("file_id")?;
                    Some(SubtitleSearchResult {
                        provider: "opensubtitles".into(),
                        language: attrs.get("language").and_then(|v| v.as_str()).unwrap_or("?").into(),
                        release_name: attrs
                            .get("release")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown release")
                            .into(),
                        download_url: None,
                        file_id: Some(file_id.to_string()),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

async fn search_subdl(client: &reqwest::Client, api_key: &str, query: &str) -> Vec<SubtitleSearchResult> {
    let Ok(resp) = client
        .get("https://api.subdl.com/api/v1/subtitles")
        .query(&[("api_key", api_key), ("film_name", query)])
        .send()
        .await
    else {
        return Vec::new();
    };
    let Ok(body) = resp.json::<Value>().await else {
        return Vec::new();
    };
    body.get("subtitles")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let url = item.get("url")?.as_str()?;
                    Some(SubtitleSearchResult {
                        provider: "subdl".into(),
                        language: item.get("language").and_then(|v| v.as_str()).unwrap_or("?").into(),
                        release_name: item
                            .get("release_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown release")
                            .into(),
                        // SubDL's search response returns a path relative to
                        // its download host, not a full URL.
                        download_url: Some(format!("https://dl.subdl.com{url}")),
                        file_id: None,
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
pub async fn search_subtitles(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SubtitleSearchResult>, String> {
    let settings = state.persistence.snapshot().await;
    let client = reqwest::Client::new();
    let mut results = Vec::new();

    if let Some(key) = settings
        .subtitle_providers
        .opensubtitles_api_key
        .filter(|k| !k.trim().is_empty())
    {
        results.extend(search_opensubtitles(&client, &key, &query).await);
    }
    if let Some(key) = settings.subtitle_providers.subdl_api_key.filter(|k| !k.trim().is_empty()) {
        results.extend(search_subdl(&client, &key, &query).await);
    }
    Ok(results)
}

/// Downloads a search result to disk (next to the currently playing file)
/// and returns the local path, ready to hand to `mpv_load_subtitle`.
#[tauri::command]
pub async fn download_subtitle(
    state: State<'_, AppState>,
    result: SubtitleSearchResult,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let bytes = match result.provider.as_str() {
        "opensubtitles" => {
            let settings = state.persistence.snapshot().await;
            let api_key = settings
                .subtitle_providers
                .opensubtitles_api_key
                .ok_or("OpenSubtitles API key is not set")?;
            let file_id = result.file_id.ok_or("Missing file_id for OpenSubtitles result")?;
            let resp = client
                .post("https://api.opensubtitles.com/api/v1/download")
                .header("Api-Key", &api_key)
                .header("User-Agent", user_agent())
                .json(&serde_json::json!({ "file_id": file_id.parse::<i64>().unwrap_or_default() }))
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let body: Value = resp.json().await.map_err(|e| e.to_string())?;
            let link = body
                .get("link")
                .and_then(|v| v.as_str())
                .ok_or("OpenSubtitles didn't return a download link — daily quota may be exhausted")?;
            client.get(link).send().await.map_err(|e| e.to_string())?.bytes().await
        }
        "subdl" => {
            let url = result.download_url.ok_or("Missing download URL for SubDL result")?;
            client.get(&url).send().await.map_err(|e| e.to_string())?.bytes().await
        }
        other => return Err(format!("Unsupported provider: {other}")),
    }
    .map_err(|e| e.to_string())?;

    // SubDL sometimes serves a .zip archive instead of a raw .srt for a
    // given release — writing that out with a ".srt" extension would
    // silently produce a file mpv can't read. Failing loudly here at
    // least surfaces the real problem instead of a mysterious "subtitle
    // won't load" further down the line; unzipping isn't implemented yet.
    if bytes.starts_with(b"PK\x03\x04") {
        return Err(
            "This result is a .zip archive, not a plain subtitle file — automatic \
             extraction isn't implemented yet. Try a different result."
                .into(),
        );
    }

    let video_path = state.current_file.read().await.clone().ok_or("No file is currently open")?;
    let dir = std::path::Path::new(&video_path)
        .parent()
        .ok_or("Could not determine the video's directory")?;
    let safe_name: String = result
        .release_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' { c } else { '_' })
        .collect();
    let dest = dir.join(format!("{safe_name}.{}.srt", result.language));
    std::fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}
