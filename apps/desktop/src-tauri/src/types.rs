/// Shared serialisable data types returned by Tauri commands.
///
/// These types are the **single source of truth** for the JSON contract between
/// the Rust backend and the TypeScript frontend. Every `#[tauri::command]`
/// that returns structured data must use these types rather than
/// `serde_json::Value`, so that drift between sides is caught at compile time.
///
/// All structs use `#[serde(rename_all = "camelCase")]` so field names arrive
/// in the TypeScript frontend as camelCase (e.g. `activePanelName`).
use serde::{Deserialize, Serialize};

// ─── Color Category ───────────────────────────────────────────────────────────

/// Pad color category — controls gradient background and playing-state border color.
///
/// Serialised as a string (e.g. `"Audience"`) by serde's default enum repr.
/// Must stay in sync with `ColorCategory` in `packages/ui/src/components/SoundPad.tsx`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ColorCategory {
    Audience,
    Nature,
    Traffic,
    Arcade,
    Sports,
    Custom,
}

impl ColorCategory {
    /// Auto-assign a color category from a panel name using keyword matching.
    ///
    /// Matching is case-insensitive. If no keyword matches, returns `Custom`.
    pub fn from_panel_name(name: &str) -> Self {
        let lower = name.to_lowercase();
        if ["audience", "crowd", "people", "human", "funny", "comedy", "laugh"]
            .iter()
            .any(|kw| lower.contains(kw))
        {
            Self::Audience
        } else if ["nature", "ambient", "forest", "rain", "outdoor", "animal", "bird", "water", "weather", "wind"]
            .iter()
            .any(|kw| lower.contains(kw))
        {
            Self::Nature
        } else if ["traffic", "urban", "city", "transport", "bell", "chime", "alarm", "horn"]
            .iter()
            .any(|kw| lower.contains(kw))
        {
            Self::Traffic
        } else if ["arcade", "game", "retro", "8bit", "musical", "music", "instrument"]
            .iter()
            .any(|kw| lower.contains(kw))
        {
            Self::Arcade
        } else if ["sport", "athletic", "gym"]
            .iter()
            .any(|kw| lower.contains(kw))
        {
            Self::Sports
        } else {
            Self::Custom
        }
    }
}

// ─── Index State ──────────────────────────────────────────────────────────────

/// State of a directory's index — used in the Folders screen to show scan status.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IndexState {
    Clean,
    Stale,
    Indexing,
    Error(String),
}

// ─── Sound / Panel ────────────────────────────────────────────────────────────

/// A single playable sound file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sound {
    /// Display name derived from the filename (stem, spaces, capitalised).
    pub name: String,
    /// Absolute filesystem path to the `.wav` file.
    pub path: String,
    /// 1-based position within the parent panel.
    pub index: u32,
    /// Name of the parent panel (denormalized for fast lookup).
    pub panel_name: String,
    /// File size in bytes — used for disk usage stats and 50MB guard.
    pub file_size_bytes: u64,
}

/// A named group of sounds, corresponding to one subdirectory in a root.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Panel {
    /// Directory name used as the panel title (e.g. `"Ambient"`).
    pub name: String,
    /// Color category — derived from the panel name by `Scanner`. Controls pad gradient.
    pub color_category: ColorCategory,
    /// Ordered list of sounds within this panel.
    pub sounds: Vec<Sound>,
    /// Number of sounds in this panel.
    pub sound_count: usize,
    /// The directory paths that contributed sounds to this panel.
    pub source_directories: Vec<String>,
}

// ─── Directory ───────────────────────────────────────────────────────────────

/// A user-configured root path on the filesystem that the app scans for panels.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Directory {
    /// Absolute canonicalized root path.
    pub path: String,
    /// Display label derived from the final path component.
    pub label: String,
    /// True if the directory is a read-only preset (cannot be removed).
    pub is_read_only: bool,
    /// Current index state (Clean, Stale, Indexing, Error).
    pub index_state: IndexState,
    /// Total number of .wav files discovered.
    pub asset_count: u32,
    /// Sum of file_size_bytes for all sounds in this directory.
    pub disk_usage_bytes: u64,
    /// Timestamp of last successful scan (ISO 8601).
    pub last_indexed_at: Option<chrono::DateTime<chrono::Utc>>,
    /// Duration of the last scan in milliseconds.
    pub latency_ms: Option<f64>,
}

// ─── Session ──────────────────────────────────────────────────────────────────

/// Live audio session state, emitted on `soundblart://session-changed`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    /// Name of the currently active panel, or `None` if no panel is selected.
    pub active_panel_name: Option<String>,
    /// Absolute path of the currently playing sound, or `None` if idle.
    pub playing_sound_path: Option<String>,
    /// Master volume in `[0.0, 1.0]`.
    pub master_volume: f32,
    /// Whether the session is "live" (i.e. a sound is playing or ready).
    pub is_live: bool,
}

impl Default for Session {
    fn default() -> Self {
        Self {
            active_panel_name: None,
            playing_sound_path: None,
            master_volume: 1.0,
            is_live: false,
        }
    }
}

// ─── Library ──────────────────────────────────────────────────────────────────

/// Snapshot of the library index state, returned by `get_library_stats`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryStats {
    /// Total number of panels across all roots.
    pub panel_count: usize,
    /// Total number of sounds across all panels.
    pub sound_count: usize,
    /// Number of root directories currently tracked.
    pub directory_count: usize,
}

/// Describes a single root directory tracked by the library (simplified view for IPC).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryInfo {
    /// Absolute path to the root directory.
    pub path: String,
    /// Whether the directory is a read-only preset (cannot be removed by the user).
    pub read_only: bool,
}

/// State returned by operations that change directory config.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStateResponse {
    /// All root directories currently tracked.
    pub directories: Vec<DirectoryInfo>,
    /// Aggregated counts after the latest scan.
    pub stats: LibraryStats,
}

// ─── AppConfig ────────────────────────────────────────────────────────────────

/// Persisted configuration — stored via tauri-plugin-store.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// Schema version for forward-compat migration.
    pub version: u32,
    /// Ordered list of canonical directory paths the user has added.
    pub directory_paths: Vec<String>,
    /// Last-set master volume, restored on launch.
    pub master_volume: f32,
    /// Name of the panel that was active on last quit.
    pub last_active_panel: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: 1,
            directory_paths: Vec::new(),
            master_volume: 1.0,
            last_active_panel: None,
        }
    }
}
