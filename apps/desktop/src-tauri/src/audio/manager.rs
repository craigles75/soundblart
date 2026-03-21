use std::collections::HashMap;

use kira::manager::{AudioManager as KiraManager, AudioManagerSettings, DefaultBackend};
use kira::sound::static_sound::{StaticSoundData, StaticSoundHandle};
use kira::sound::PlaybackState;
use kira::tween::Tween;
use kira::Volume;

use crate::audio::loader::AudioLoader;
use crate::error::AppError;

/// Manages a single kira audio backend instance and the currently-playing sound.
///
/// In the Tauri context this is held inside `tauri::State<Mutex<AudioState>>`.
/// All public methods must be callable from Tauri command handlers.
///
/// # Lock acquisition order (canonical, documented for deadlock prevention)
///
/// When multiple locks from `AppStateDeps` must be held simultaneously, always
/// acquire in this order: `config` → `library` → `audio` → `session`.
/// See `commands/mod.rs` for the authoritative declaration.
///
/// # Real-time safety
///
/// kira's audio callback runs on a dedicated thread managed by cpal. No allocations
/// or mutex locks occur inside that callback. This struct only enqueues commands
/// via kira's lock-free command queue.
pub struct AudioState {
    kira_manager: KiraManager<DefaultBackend>,
    /// Handle to the currently playing session sound, if any.
    current_handle: Option<StaticSoundHandle>,
    /// Path of the currently playing session sound.
    current_path: Option<String>,
    /// Handle to the currently playing preview sound (separate from session).
    preview_handle: Option<StaticSoundHandle>,
    /// Pre-decoded sound data keyed by canonical path.
    /// Populated at scan time for zero-latency playback.
    loaded_sounds: HashMap<String, StaticSoundData>,
    /// Master volume [0.0, 1.0].
    volume: f32,
}

impl AudioState {
    /// Create a new `AudioState`, initialising the underlying kira backend.
    pub fn new() -> Result<Self, AppError> {
        let kira_manager = KiraManager::<DefaultBackend>::new(AudioManagerSettings::default())
            .map_err(|e| AppError::Audio(format!("Failed to initialize audio backend: {e}")))?;

        Ok(Self {
            kira_manager,
            current_handle: None,
            current_path: None,
            preview_handle: None,
            loaded_sounds: HashMap::new(),
            volume: 1.0,
        })
    }

    /// Pre-load a WAV file into memory for instant playback.
    /// Called during library scan to populate the loaded_sounds cache.
    pub fn preload(&mut self, path: &str) -> Result<(), AppError> {
        if self.loaded_sounds.contains_key(path) {
            return Ok(());
        }
        let data = AudioLoader::load(path)?;
        self.loaded_sounds.insert(path.to_string(), data);
        Ok(())
    }

    /// Remove a preloaded sound from the cache.
    pub fn evict(&mut self, path: &str) {
        self.loaded_sounds.remove(path);
    }

    /// Remove all preloaded sounds whose paths start with a given directory prefix.
    /// Uses path-separator-aware matching to avoid false positives
    /// (e.g., `/tmp/sounds` should not match `/tmp/sounds-extra`).
    pub fn evict_prefix(&mut self, dir_path: &str) {
        let prefix = if dir_path.ends_with(std::path::MAIN_SEPARATOR) {
            dir_path.to_string()
        } else {
            format!("{}{}", dir_path, std::path::MAIN_SEPARATOR)
        };
        self.loaded_sounds
            .retain(|k, _| !k.starts_with(&prefix) && k != dir_path);
    }

    /// Start playback of the sound at `path`.
    ///
    /// Stops any currently playing sound first. If `path` is already playing,
    /// this stops it (toggle semantics).
    pub fn play_sound(&mut self, path: &str) -> Result<(), AppError> {
        // Toggle: if same sound is playing and still active, just stop
        if self.current_path.as_deref() == Some(path) && self.is_handle_active() {
            self.stop()?;
            return Ok(());
        }

        // Stop current sound first
        self.stop()?;

        // Get the pre-loaded sound data
        let data = self
            .loaded_sounds
            .get(path)
            .ok_or_else(|| AppError::SoundNotLoaded {
                path: path.to_string(),
            })?
            .clone();

        // Play it
        let mut handle = self
            .kira_manager
            .play(data)
            .map_err(|e| AppError::Audio(format!("Playback failed: {e}")))?;

        // Apply current volume
        handle
            .set_volume(Volume::Amplitude(self.volume as f64), Tween::default())
            .map_err(|e| AppError::Audio(format!("Volume set failed: {e}")))?;

        self.current_handle = Some(handle);
        self.current_path = Some(path.to_string());

        Ok(())
    }

    /// Stop the currently playing session sound.
    pub fn stop(&mut self) -> Result<(), AppError> {
        if let Some(mut handle) = self.current_handle.take() {
            // Only send stop command if still playing
            if handle.state() == PlaybackState::Playing {
                let _ = handle.stop(Tween::default());
            }
        }
        self.current_path = None;
        Ok(())
    }

    /// Set master volume. `level` is clamped to `[0.0, 1.0]`.
    pub fn set_volume(&mut self, level: f32) -> Result<(), AppError> {
        self.volume = level.clamp(0.0, 1.0);

        // Apply to currently playing sound if any
        if let Some(ref mut handle) = self.current_handle {
            handle
                .set_volume(
                    Volume::Amplitude(self.volume as f64),
                    Tween::default(),
                )
                .map_err(|e| AppError::Audio(format!("Volume set failed: {e}")))?;
        }

        Ok(())
    }

    /// Start preview playback — separate from the session channel.
    pub fn preview_sound(&mut self, path: &str) -> Result<(), AppError> {
        // Stop any current preview
        self.stop_preview()?;

        let data = self
            .loaded_sounds
            .get(path)
            .ok_or_else(|| AppError::SoundNotLoaded {
                path: path.to_string(),
            })?
            .clone();

        let mut handle = self
            .kira_manager
            .play(data)
            .map_err(|e| AppError::Audio(format!("Preview playback failed: {e}")))?;

        handle
            .set_volume(Volume::Amplitude(self.volume as f64), Tween::default())
            .map_err(|e| AppError::Audio(format!("Preview volume set failed: {e}")))?;

        self.preview_handle = Some(handle);
        Ok(())
    }

    /// Stop the preview playback, if any.
    pub fn stop_preview(&mut self) -> Result<(), AppError> {
        if let Some(mut handle) = self.preview_handle.take() {
            if handle.state() == PlaybackState::Playing {
                let _ = handle.stop(Tween::default());
            }
        }
        Ok(())
    }

    /// Return the path of the currently playing session sound, if any.
    /// Checks the kira handle to detect natural playback completion.
    pub fn current_path(&mut self) -> Option<&str> {
        // Check if the sound has finished naturally
        if let Some(ref handle) = self.current_handle {
            if handle.state() != PlaybackState::Playing {
                // Sound finished naturally — clear state
                self.current_handle = None;
                self.current_path = None;
                return None;
            }
        }
        self.current_path.as_deref()
    }

    /// Check if a sound just finished playing naturally.
    /// Returns the path of the finished sound, if any, and clears state.
    pub fn check_sound_finished(&mut self) -> Option<String> {
        if let Some(ref handle) = self.current_handle {
            if handle.state() != PlaybackState::Playing {
                let path = self.current_path.take();
                self.current_handle = None;
                return path;
            }
        }
        None
    }

    /// Return the current master volume in `[0.0, 1.0]`.
    pub fn volume(&self) -> f32 {
        self.volume
    }

    /// Return whether a session sound is currently playing.
    /// Checks the kira handle state rather than just `current_path`.
    pub fn is_playing(&self) -> bool {
        self.current_handle
            .as_ref()
            .map(|h| h.state() == PlaybackState::Playing)
            .unwrap_or(false)
    }

    /// Check if the current handle is still actively playing.
    fn is_handle_active(&self) -> bool {
        self.current_handle
            .as_ref()
            .map(|h| h.state() == PlaybackState::Playing)
            .unwrap_or(false)
    }
}
