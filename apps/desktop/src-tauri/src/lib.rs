pub mod audio;
pub mod commands;
pub mod config;
pub mod error;
pub mod library;
pub mod presets;
pub mod types;

use std::sync::{Mutex, RwLock};

use commands::{audio as audio_cmd, dialog as dialog_cmd, library as library_cmd, AppStateDeps};

/// Entry point called by `main.rs`. Builds and runs the Tauri application.
///
/// # Panics
///
/// Panics if the Tauri runtime cannot be initialised — this is unrecoverable
/// at startup and intentional (no reasonable fallback exists).
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Load persisted config (or defaults)
            let app_config =
                config::store::ConfigStore::load(&app.handle()).unwrap_or_default();

            // Install bundled presets on first run
            let preset_dir = match presets::installer::PresetInstaller::ensure_installed(
                &app.handle(),
            ) {
                Ok(dir) => {
                    let dir_str = dir.to_string_lossy().to_string();
                    // If presets dir is not already in config, add it
                    let mut config = app_config.clone();
                    if !config.directory_paths.contains(&dir_str) {
                        config.directory_paths.insert(0, dir_str.clone());
                        let _ =
                            crate::config::store::ConfigStore::save(&app.handle(), &config);
                    }
                    Some(dir_str)
                }
                Err(e) => {
                    log::warn!("Preset installation failed: {}", e);
                    None
                }
            };

            // Re-load config after potential preset dir addition
            let app_config =
                config::store::ConfigStore::load(&app.handle()).unwrap_or_default();

            // Initialise audio engine (required — no fallback)
            let audio_state = audio::manager::AudioState::new()
                .expect("Audio engine failed to initialize — no audio output device available");

            // Build initial library index
            let library_index =
                library::index::LibraryIndex::build(&app_config.directory_paths)
                    .unwrap_or_default();

            // Preload all sounds for instant playback
            let mut audio = audio_state;
            for panel in library_index.get_panels() {
                for sound in &panel.sounds {
                    if let Err(e) = audio.preload(&sound.path) {
                        log::warn!("Failed to preload {}: {}", sound.path, e);
                    }
                }
            }

            // Restore session from config
            let session = types::Session {
                active_panel_name: app_config
                    .last_active_panel
                    .clone()
                    .filter(|name| library_index.has_panel(name))
                    .or_else(|| library_index.first_panel_name()),
                master_volume: app_config.master_volume,
                ..Default::default()
            };

            // Apply restored volume
            let _ = audio.set_volume(app_config.master_volume);

            // Register managed state
            app.manage(AppStateDeps {
                library: RwLock::new(library_index),
                audio: Mutex::new(audio),
                session: Mutex::new(session),
                config: Mutex::new(app_config),
                preset_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Audio commands
            audio_cmd::play_sound,
            audio_cmd::stop_sound,
            audio_cmd::set_volume,
            audio_cmd::get_session,
            audio_cmd::preview_sound,
            audio_cmd::stop_preview,
            // Library commands
            library_cmd::get_panels,
            library_cmd::set_active_panel,
            library_cmd::get_directories,
            library_cmd::get_library_stats,
            library_cmd::add_directory,
            library_cmd::remove_directory,
            library_cmd::refresh_library,
            // Dialog commands
            dialog_cmd::pick_directory,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Soundblart — Tauri runtime error");
}
