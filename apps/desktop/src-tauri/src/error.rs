// Soundblart application error types.
// Using thiserror for structured, ergonomic error definitions.

use thiserror::Error;

/// Top-level application error. All Tauri command handlers convert this to
/// `String` via the `Display` impl so the frontend receives a human-readable
/// error message.
#[derive(Debug, Error)]
pub enum AppError {
    // ─── Audio errors ──────────────────────────────────────────────────────
    #[error("Audio engine error: {0}")]
    Audio(String),

    #[error("Sound not loaded: {path}")]
    SoundNotLoaded { path: String },

    // ─── Path / security errors ────────────────────────────────────────────
    #[error("Path outside approved directory: {0}")]
    PathTraversal(String),

    #[error("Only .wav files permitted — got .{ext} extension: {path}")]
    InvalidExtension { path: String, ext: String },

    #[error("File too large ({size} bytes > {limit} bytes limit): {path}")]
    FileTooLarge { size: u64, limit: u64, path: String },

    #[error("Cannot resolve path '{path}': {reason}")]
    PathResolution { path: String, reason: String },

    // ─── Library errors ────────────────────────────────────────────────────
    #[error("Panel not found: {0}")]
    PanelNotFound(String),

    #[error("Directory already added: {0}")]
    DirectoryDuplicate(String),

    #[error("Cannot remove read-only directory: {0}")]
    DirectoryReadOnly(String),

    #[error("Directory not found in library: {0}")]
    DirectoryNotFound(String),

    #[error("Directory not accessible: {reason}")]
    DirectoryInaccessible { reason: String },

    #[error("Scan failed: {reason}")]
    ScanFailed { reason: String },

    // ─── Config errors ─────────────────────────────────────────────────────
    #[error("Config error: {0}")]
    Config(String),

    // ─── I/O errors ────────────────────────────────────────────────────────
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

impl From<AppError> for String {
    fn from(e: AppError) -> String {
        e.to_string()
    }
}

/// Convenience alias for Tauri command return types.
///
/// All `#[tauri::command]` handlers should use this so the error conversion
/// to `String` (required by Tauri) is consistent. Use `.map_err(Into::into)?`
/// to propagate `AppError` through this type.
///
/// # Example
/// ```rust,ignore
/// pub fn play_sound(path: String) -> CommandResult<()> {
///     validate_sound_path(&path, &allowed_roots)?;
///     audio_manager.play(path).map_err(Into::into)
/// }
/// ```
pub type CommandResult<T> = Result<T, String>;
