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

/// Cheap file-identity hash for resume-entry keys: path + size + mtime, not
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
