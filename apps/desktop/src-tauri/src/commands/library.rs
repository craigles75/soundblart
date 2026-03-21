use tauri::{AppHandle, Emitter, State};

use crate::config::store::ConfigStore;
use crate::error::{AppError, CommandResult};
use crate::library::index::LibraryIndex;
use crate::types::{DirectoryInfo, IndexStateResponse, LibraryStats, Panel, Session};

use super::AppStateDeps;

/// Build a Session snapshot (shared helper, same as audio.rs).
fn build_session(deps: &AppStateDeps) -> Session {
    let mut audio = deps.audio.lock().unwrap();
    let session = deps.session.lock().unwrap();
    Session {
        active_panel_name: session.active_panel_name.clone(),
        playing_sound_path: audio.current_path().map(String::from),
        master_volume: audio.volume(),
        is_live: audio.is_playing(),
    }
}

#[tauri::command]
pub fn get_panels(deps: State<'_, AppStateDeps>) -> CommandResult<Vec<Panel>> {
    let index = deps.library.read().unwrap();
    Ok(index.get_panels())
}

#[tauri::command]
pub fn set_active_panel(
    app: AppHandle,
    panel_name: String,
    deps: State<'_, AppStateDeps>,
) -> CommandResult<()> {
    // Verify panel exists
    {
        let index = deps.library.read().unwrap();
        if !index.has_panel(&panel_name) {
            return Err(AppError::PanelNotFound(panel_name).to_string());
        }
    }

    // Update session
    {
        let mut session = deps.session.lock().unwrap();
        session.active_panel_name = Some(panel_name.clone());
    }

    // Persist to config
    let _ = ConfigStore::set_active_panel(&app, &panel_name);

    // Emit session change (reuse shared helper)
    let session_snapshot = build_session(&deps);
    let _ = app.emit("soundblart://session-changed", &session_snapshot);

    Ok(())
}

#[tauri::command]
pub fn get_directories(deps: State<'_, AppStateDeps>) -> CommandResult<Vec<DirectoryInfo>> {
    let config = deps.config.lock().unwrap();
    let dirs = build_directory_list(&config.directory_paths, deps.preset_dir.as_deref());
    Ok(dirs)
}

#[tauri::command]
pub fn get_library_stats(deps: State<'_, AppStateDeps>) -> CommandResult<LibraryStats> {
    let index = deps.library.read().unwrap();
    let config = deps.config.lock().unwrap();
    Ok(index.stats(config.directory_paths.len()))
}

#[tauri::command]
pub fn add_directory(
    app: AppHandle,
    path: String,
    deps: State<'_, AppStateDeps>,
) -> CommandResult<IndexStateResponse> {
    // Canonicalize and validate
    let canonical = std::fs::canonicalize(&path).map_err(|e| {
        AppError::PathResolution {
            path: path.clone(),
            reason: e.to_string(),
        }
        .to_string()
    })?;
    let canonical_str = canonical.to_string_lossy().to_string();

    if !canonical.is_dir() {
        return Err(AppError::DirectoryInaccessible {
            reason: format!("Path is not a directory: {}", canonical_str),
        }
        .to_string());
    }

    // Check for duplicate
    {
        let config = deps.config.lock().unwrap();
        if config.directory_paths.contains(&canonical_str) {
            return Err(AppError::DirectoryDuplicate(canonical_str).to_string());
        }
    }

    // Add to config and persist
    {
        let mut config = deps.config.lock().unwrap();
        config.directory_paths.push(canonical_str.clone());
        ConfigStore::save(&app, &config).map_err(|e| e.to_string())?;
    }

    // Rebuild library index
    let stats = rebuild_library(&app, &deps)?;

    let config = deps.config.lock().unwrap();
    let dirs = build_directory_list(&config.directory_paths, deps.preset_dir.as_deref());

    Ok(IndexStateResponse {
        directories: dirs,
        stats,
    })
}

#[tauri::command]
pub fn remove_directory(
    app: AppHandle,
    path: String,
    deps: State<'_, AppStateDeps>,
) -> CommandResult<()> {
    // Canonicalize the input path for consistent comparison
    let canonical_str = std::fs::canonicalize(&path)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| path.clone());

    // Check read-only (compare canonical paths)
    if deps.preset_dir.as_deref() == Some(canonical_str.as_str()) {
        return Err(AppError::DirectoryReadOnly(canonical_str).to_string());
    }

    // Remove from config (acquire config lock first per lock ordering)
    {
        let mut config = deps.config.lock().unwrap();
        if !config.directory_paths.contains(&canonical_str) {
            return Err(AppError::DirectoryNotFound(canonical_str).to_string());
        }
        config.directory_paths.retain(|p| p != &canonical_str);
        ConfigStore::save(&app, &config).map_err(|e| e.to_string())?;
    }

    // Evict from library index (acquire library lock second per ordering)
    {
        let mut index = deps.library.write().unwrap();
        index.evict_directory(&canonical_str);
    }

    // Stop playback if playing sound was from this directory, evict audio cache
    // (acquire audio lock third per ordering — single acquisition, no drop+reacquire)
    {
        let mut audio = deps.audio.lock().unwrap();
        // Copy path out to release the borrow before calling stop()
        let is_affected = audio
            .current_path()
            .map(|p| is_path_in_directory(p, &canonical_str))
            .unwrap_or(false);
        // current_path() returned Option<&str> which is now dropped, so we can call &mut self methods
        if is_affected {
            let _ = audio.stop();
        }
        audio.evict_prefix(&canonical_str);
    }

    // Emit library-updated event (config → library per lock ordering)
    let stats = {
        let config = deps.config.lock().unwrap();
        let index = deps.library.read().unwrap();
        index.stats(config.directory_paths.len())
    };
    let _ = app.emit("soundblart://library-updated", &stats);

    Ok(())
}

#[tauri::command]
pub fn refresh_library(
    app: AppHandle,
    deps: State<'_, AppStateDeps>,
) -> CommandResult<Vec<Panel>> {
    // Emit refreshing event with current directories
    {
        let config = deps.config.lock().unwrap();
        let dirs = build_directory_list(&config.directory_paths, deps.preset_dir.as_deref());
        let _ = app.emit(
            "soundblart://library-refreshing",
            serde_json::json!({ "directories": dirs }),
        );
    }

    rebuild_library(&app, &deps)?;

    let index = deps.library.read().unwrap();
    let panels = index.get_panels();

    // Emit updated event
    let config = deps.config.lock().unwrap();
    let stats = index.stats(config.directory_paths.len());
    let _ = app.emit("soundblart://library-updated", &stats);

    Ok(panels)
}

/// Rebuild the library index from all configured directories.
/// Also preloads all sounds into the audio cache.
///
/// Lock ordering: config → library (write) → audio
fn rebuild_library(app: &AppHandle, deps: &AppStateDeps) -> Result<LibraryStats, String> {
    let roots = {
        let config = deps.config.lock().unwrap();
        config.directory_paths.clone()
    };

    // Build new index (no locks held during scan)
    let new_index = LibraryIndex::build(&roots).map_err(|e| e.to_string())?;

    // Preload sounds (audio lock)
    {
        let mut audio = deps.audio.lock().unwrap();
        for panel in new_index.get_panels() {
            for sound in &panel.sounds {
                if let Err(e) = audio.preload(&sound.path) {
                    log::warn!("Failed to preload {}: {}", sound.path, e);
                }
            }
        }
    }

    let stats = {
        let config = deps.config.lock().unwrap();
        new_index.stats(config.directory_paths.len())
    };

    // Swap in the new index (library write lock)
    {
        let mut index = deps.library.write().unwrap();
        *index = new_index;
    }

    // Restore active panel (session lock — last per ordering)
    {
        let index = deps.library.read().unwrap();
        let mut session = deps.session.lock().unwrap();
        if let Some(ref panel_name) = session.active_panel_name {
            if !index.has_panel(panel_name) {
                session.active_panel_name = index.first_panel_name();
            }
        } else {
            session.active_panel_name = index.first_panel_name();
        }
    }

    Ok(stats)
}

/// Build a list of DirectoryInfo from paths.
fn build_directory_list(paths: &[String], preset_dir: Option<&str>) -> Vec<DirectoryInfo> {
    paths
        .iter()
        .map(|path| DirectoryInfo {
            path: path.clone(),
            read_only: preset_dir.map(|pd| path.as_str() == pd).unwrap_or(false),
        })
        .collect()
}

/// Path-separator-aware check: is `file_path` inside `dir_path`?
fn is_path_in_directory(file_path: &str, dir_path: &str) -> bool {
    if file_path == dir_path {
        return true;
    }
    let prefix = if dir_path.ends_with(std::path::MAIN_SEPARATOR) {
        dir_path.to_string()
    } else {
        format!("{}{}", dir_path, std::path::MAIN_SEPARATOR)
    };
    file_path.starts_with(&prefix)
}
