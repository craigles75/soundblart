use std::fs;
use std::path::{Path, PathBuf};

use tauri::AppHandle;
use tauri::Manager;

use crate::error::AppError;

/// Sentinel filename placed in the presets directory after a successful install.
const SENTINEL: &str = ".soundblart-presets-installed";

/// Handles first-run installation of bundled preset sounds.
///
/// On first launch, copies the sounds bundled in `src-tauri/sounds/` to the
/// platform app-support directory so users can manage them like any other
/// sound directory.
///
/// - macOS:   `~/Library/Application Support/com.soundblart.app/presets/`
/// - Windows: `%APPDATA%\com.soundblart.app\presets\`
pub struct PresetInstaller;

impl PresetInstaller {
    /// Ensure bundled presets have been copied to app-support.
    ///
    /// Idempotent — subsequent calls detect the sentinel file and return
    /// immediately without re-copying.
    ///
    /// Returns the absolute path to the installed presets directory.
    pub fn ensure_installed(app: &AppHandle) -> Result<PathBuf, AppError> {
        let presets_dir = Self::presets_dir(app)?;
        let sentinel_path = presets_dir.join(SENTINEL);

        if sentinel_path.exists() {
            return Ok(presets_dir);
        }

        // Resolve the bundled sounds directory relative to the resource path.
        // In dev mode this is src-tauri/sounds/; in release it's bundled via tauri.conf.json.
        let resource_dir = app
            .path()
            .resource_dir()
            .map_err(|e| AppError::Config(format!("Cannot resolve resource dir: {e}")))?;

        let bundled_sounds = resource_dir.join("sounds");

        if !bundled_sounds.is_dir() {
            // No bundled sounds to install — this is fine for dev builds without sounds
            log::warn!(
                "No bundled sounds directory at {}; skipping preset install",
                bundled_sounds.display()
            );
            // Still create the presets dir and sentinel so we don't retry
            fs::create_dir_all(&presets_dir)?;
            fs::write(&sentinel_path, "no bundled sounds")?;
            return Ok(presets_dir);
        }

        // Create the presets directory
        fs::create_dir_all(&presets_dir)?;

        // Copy each subdirectory (panel) and its .wav files
        Self::copy_dir_recursive(&bundled_sounds, &presets_dir)?;

        // Write sentinel file
        fs::write(&sentinel_path, "installed")?;

        log::info!("Preset sounds installed to {}", presets_dir.display());
        Ok(presets_dir)
    }

    /// Return the absolute path to the installed presets directory.
    pub fn presets_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
        let app_support = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Config(format!("Cannot resolve app data dir: {e}")))?;

        Ok(app_support.join("presets"))
    }

    /// Recursively copy a directory, only including `.wav` files and subdirectories
    /// that contain at least one `.wav` file.
    fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), AppError> {
        let entries = fs::read_dir(src)?;

        for entry in entries {
            let entry = entry?;
            let file_type = entry.file_type()?;
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            // Skip hidden files/directories
            if name_str.starts_with('.') {
                continue;
            }

            let src_path = entry.path();
            let dst_path = dst.join(&name);

            if file_type.is_dir() {
                // Only create subdirectory if it contains .wav files
                if Self::dir_has_wav_files(&src_path) {
                    fs::create_dir_all(&dst_path)?;
                    Self::copy_dir_recursive(&src_path, &dst_path)?;
                }
            } else if file_type.is_file() {
                // Only copy .wav files
                if let Some(ext) = src_path.extension().and_then(|e| e.to_str()) {
                    if ext.eq_ignore_ascii_case("wav") {
                        fs::copy(&src_path, &dst_path)?;
                    }
                }
            }
        }

        Ok(())
    }

    /// Check if a directory contains any `.wav` files (one level deep).
    fn dir_has_wav_files(dir: &Path) -> bool {
        fs::read_dir(dir)
            .map(|entries| {
                entries.filter_map(|e| e.ok()).any(|e| {
                    e.path()
                        .extension()
                        .and_then(|ext| ext.to_str())
                        .map(|ext| ext.eq_ignore_ascii_case("wav"))
                        .unwrap_or(false)
                })
            })
            .unwrap_or(false)
    }
}
