use std::collections::{HashMap, HashSet};

use crate::error::AppError;
use crate::library::scanner::Scanner;
use crate::types::{LibraryStats, Panel, Sound};

/// An in-memory index of all panels and their sounds, built by `Scanner`.
///
/// This is the single source of truth queried by the library Tauri commands.
/// It is rebuilt in full on every rescan — no incremental update logic.
///
/// Held behind a `RwLock` in Tauri AppState — readers never block each other;
/// only refresh acquires the write lock.
pub struct LibraryIndex {
    /// Panels keyed by lowercase panel name (for case-insensitive lookup).
    panels: HashMap<String, Panel>,
    /// Sounds keyed by canonical path (for O(1) play lookup).
    sounds: HashMap<String, Sound>,
}

impl LibraryIndex {
    /// Construct an empty (unscanned) index.
    pub fn new() -> Self {
        Self {
            panels: HashMap::new(),
            sounds: HashMap::new(),
        }
    }

    /// Rebuild the index from the given `roots`.
    ///
    /// Calls `Scanner::scan_all` internally, then indexes all sounds by path.
    pub fn build(roots: &[String]) -> Result<Self, AppError> {
        let panels_vec = Scanner::scan_all(roots)?;

        let mut panels = HashMap::new();
        let mut sounds = HashMap::new();

        for panel in panels_vec {
            for sound in &panel.sounds {
                sounds.insert(sound.path.clone(), sound.clone());
            }
            panels.insert(panel.name.to_lowercase(), panel);
        }

        Ok(Self { panels, sounds })
    }

    /// Return the total number of panels.
    pub fn panel_count(&self) -> usize {
        self.panels.len()
    }

    /// Return the total number of sounds across all panels.
    pub fn sound_count(&self) -> usize {
        self.sounds.len()
    }

    /// Return all panels sorted alphabetically by name.
    pub fn get_panels(&self) -> Vec<Panel> {
        let mut panels: Vec<Panel> = self.panels.values().cloned().collect();
        panels.sort_by(|a, b| a.name.cmp(&b.name));
        panels
    }

    /// Look up a panel by name (case-insensitive).
    pub fn get_panel(&self, name: &str) -> Option<&Panel> {
        self.panels.get(&name.to_lowercase())
    }

    /// Check if a panel exists (case-insensitive).
    pub fn has_panel(&self, name: &str) -> bool {
        self.panels.contains_key(&name.to_lowercase())
    }

    /// Look up a sound by its canonical path.
    pub fn get_sound(&self, path: &str) -> Option<&Sound> {
        self.sounds.get(path)
    }

    /// Check if a sound path is in the index.
    pub fn has_sound(&self, path: &str) -> bool {
        self.sounds.contains_key(path)
    }

    /// Return aggregate library statistics.
    pub fn stats(&self, directory_count: usize) -> LibraryStats {
        LibraryStats {
            panel_count: self.panel_count(),
            sound_count: self.sound_count(),
            directory_count,
        }
    }

    /// Return the name of the first panel (alphabetically), if any.
    /// Used to select a default panel when the stored one is no longer available.
    pub fn first_panel_name(&self) -> Option<String> {
        self.get_panels().first().map(|p| p.name.clone())
    }

    /// Remove all sounds whose paths are inside the given directory.
    /// Uses path-separator-aware matching to avoid false positives
    /// (e.g., `/tmp/sounds` won't match `/tmp/sounds-extra`).
    /// Returns the number of sounds removed.
    pub fn evict_directory(&mut self, dir_path: &str) -> usize {
        let prefix = if dir_path.ends_with(std::path::MAIN_SEPARATOR) {
            dir_path.to_string()
        } else {
            format!("{}{}", dir_path, std::path::MAIN_SEPARATOR)
        };
        let paths_to_remove: Vec<String> = self
            .sounds
            .keys()
            .filter(|p| p.starts_with(&prefix) || p.as_str() == dir_path)
            .cloned()
            .collect();

        let removed = paths_to_remove.len();
        let evict_set: HashSet<&str> = paths_to_remove.iter().map(|s| s.as_str()).collect();

        for path in &paths_to_remove {
            self.sounds.remove(path);
        }

        // Rebuild panels, removing evicted sounds
        self.panels.retain(|_, panel| {
            panel.sounds.retain(|s| !evict_set.contains(s.path.as_str()));
            panel.sound_count = panel.sounds.len();
            // Re-index remaining sounds
            for (i, sound) in panel.sounds.iter_mut().enumerate() {
                sound.index = (i + 1) as u32;
            }
            // Remove panels with no sounds left
            !panel.sounds.is_empty()
        });

        // Remove source directory references
        for panel in self.panels.values_mut() {
            panel.source_directories.retain(|d| d != dir_path);
        }

        removed
    }
}

impl Default for LibraryIndex {
    fn default() -> Self {
        Self::new()
    }
}
