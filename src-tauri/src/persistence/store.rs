use std::fs;
use std::path::{Path, PathBuf};

use tokio::sync::RwLock;

use super::models::{AppSettings, ResumeEntry, RESUME_HISTORY_CAP};

pub struct PersistenceStore {
    path: PathBuf,
    state: RwLock<AppSettings>,
}

impl PersistenceStore {
    pub fn load(app_data_dir: &Path) -> Self {
        let path = app_data_dir.join("state.json");
        let state = fs::read_to_string(&path)
            .ok()
            .and_then(|raw| serde_json::from_str::<AppSettings>(&raw).ok())
            .unwrap_or_default();
        Self {
            path,
            state: RwLock::new(state),
        }
    }

    pub async fn snapshot(&self) -> AppSettings {
        self.state.read().await.clone()
    }

    pub async fn replace(&self, settings: AppSettings) {
        *self.state.write().await = settings;
    }

    pub async fn resume_entry(&self, file_id: &str) -> Option<ResumeEntry> {
        self.state.read().await.resume.get(file_id).cloned()
    }

    pub async fn upsert_resume_entry(&self, file_id: String, entry: ResumeEntry) {
        let mut state = self.state.write().await;
        state.resume.insert(file_id, entry);
        if state.resume.len() > RESUME_HISTORY_CAP {
            let mut by_age: Vec<(String, String)> = state
                .resume
                .iter()
                .map(|(id, e)| (id.clone(), e.last_played_at.clone()))
                .collect();
            by_age.sort_by(|a, b| a.1.cmp(&b.1));
            let overflow = state.resume.len() - RESUME_HISTORY_CAP;
            for (id, _) in by_age.into_iter().take(overflow) {
                state.resume.remove(&id);
            }
        }
    }

    pub async fn save(&self) -> std::io::Result<()> {
        let snapshot = self.state.read().await.clone();
        let json = serde_json::to_string_pretty(&snapshot)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, json)
    }
}

/// Resume-entry identity for a local file: path + size + mtime, not
/// full-content hashing, so it stays fast even for large video files.
pub fn file_identity(path: &Path) -> String {
    let metadata = fs::metadata(path).ok();
    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
    let mtime = metadata
        .as_ref()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let mut hasher = blake3::Hasher::new();
    hasher.update(path.to_string_lossy().as_bytes());
    hasher.update(&size.to_le_bytes());
    hasher.update(&mtime.to_le_bytes());
    hasher.finalize().to_hex().to_string()
}

/// Resume-entry identity for whatever `mpv_load_file` was given — a local
/// path OR a stream URL (http(s)/rtsp/rtmp/smb/...). Gating resume/volume
/// persistence on `Path::exists()` meant it silently never activated for
/// any network source, since a URL is never a real filesystem path. For
/// URLs there's no size/mtime to hash, so the URL string itself is the
/// identity — stable across app restarts as long as the URL doesn't change.
pub fn resume_identity(path_or_url: &str) -> String {
    if path_or_url.contains("://") {
        blake3::hash(path_or_url.as_bytes()).to_hex().to_string()
    } else {
        file_identity(Path::new(path_or_url))
    }
}
