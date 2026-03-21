pub mod audio;
pub mod dialog;
pub mod library;

use std::sync::{Mutex, RwLock};

use crate::audio::manager::AudioState;
use crate::library::index::LibraryIndex;
use crate::types::{AppConfig, Session};

/// Shared application state dependencies injected into all Tauri commands via `State<AppStateDeps>`.
///
/// Uses interior mutability:
/// - `library`: `RwLock` — readers (play, get_panels) never block each other;
///   only refresh acquires the write lock.
/// - `audio`, `session`, `config`: `Mutex` — exclusive access for mutations.
///
/// # Lock acquisition order (CANONICAL — all commands MUST follow this)
///
/// When multiple locks must be held simultaneously:
///
/// ```text
/// config -> library -> audio -> session
/// ```
///
/// Never acquire a lock that precedes one you already hold. This prevents
/// ABBA deadlocks. If you need to hold `audio` and then `config`, release
/// `audio` first, acquire `config`, then re-acquire `audio`.
pub struct AppStateDeps {
    pub library: RwLock<LibraryIndex>,
    pub audio: Mutex<AudioState>,
    pub session: Mutex<Session>,
    pub config: Mutex<AppConfig>,
    /// Path to the preset directory, if installed. Used to mark it as read-only.
    /// Immutable after setup — safe to read without locking.
    pub preset_dir: Option<String>,
}
