use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::library::validator;
use crate::types::{ColorCategory, Panel, Sound};

/// Scans one or more root directories, grouping `.wav` files into named panels.
///
/// Each non-hidden immediate subdirectory of a root becomes a panel. `.wav` files
/// at the root level are ignored. Panels with the same name across multiple roots
/// are merged — their sound lists are concatenated.
pub struct Scanner;

/// Raw scan result before merging — maps panel_name → list of (path, file_size).
type RawScanResult = HashMap<String, Vec<(PathBuf, u64)>>;

impl Scanner {
    /// Scan all provided `roots` and return a list of Panels with their sounds.
    ///
    /// Hidden directories (name starts with `.`) are skipped.
    /// Only files ending in `.wav` (case-insensitive) are included.
    /// Panels with zero .wav files are excluded.
    /// Panels with the same name across roots are merged (case-insensitive).
    pub fn scan_all(roots: &[String]) -> Result<Vec<Panel>, AppError> {
        let mut raw: RawScanResult = HashMap::new();
        // Track which directories contributed to each panel
        let mut panel_sources: HashMap<String, Vec<String>> = HashMap::new();
        // Store the original (first-seen) display name for each merge key
        let mut panel_display_names: HashMap<String, String> = HashMap::new();

        for root in roots {
            let root_path = Path::new(root);
            if !validator::is_valid_directory(root_path) {
                log::warn!("Skipping inaccessible directory: {}", root);
                continue;
            }

            let entries = std::fs::read_dir(root_path).map_err(|e| AppError::ScanFailed {
                reason: format!("Cannot read directory {}: {}", root, e),
            })?;

            for entry in entries {
                let entry = entry.map_err(|e| AppError::ScanFailed {
                    reason: e.to_string(),
                })?;

                let name = entry.file_name();
                let name_str = name.to_string_lossy();

                // Skip hidden directories
                if name_str.starts_with('.') {
                    continue;
                }

                // Only process directories (panels)
                if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    continue;
                }

                let panel_dir = entry.path();
                let panel_name = Self::derive_display_name(&name_str);
                let merge_key = panel_name.to_lowercase();

                // Scan .wav files in this panel directory
                let wav_files = Self::scan_panel_dir(&panel_dir)?;

                if wav_files.is_empty() {
                    continue; // Skip panels with zero .wav files
                }

                raw.entry(merge_key.clone())
                    .or_default()
                    .extend(wav_files);

                // Keep the first-seen display name (preserves original casing like "SFX")
                panel_display_names
                    .entry(merge_key.clone())
                    .or_insert_with(|| panel_name.clone());

                panel_sources
                    .entry(merge_key)
                    .or_default()
                    .push(root.clone());
            }
        }

        // Build Panel structs from raw scan data
        let mut panels: Vec<Panel> = raw
            .into_iter()
            .map(|(merge_key, files)| {
                // Use the original display name, not re-derived from lowercase
                let panel_name = panel_display_names
                    .remove(&merge_key)
                    .unwrap_or_else(|| Self::derive_display_name(&merge_key));
                let color_category = ColorCategory::from_panel_name(&panel_name);

                let mut sounds: Vec<Sound> = files
                    .into_iter()
                    .map(|(path, file_size_bytes)| {
                        let name = Self::derive_sound_name(&path);
                        Sound {
                            name,
                            path: path.to_string_lossy().to_string(),
                            index: 0, // Re-indexed below
                            panel_name: panel_name.clone(),
                            file_size_bytes,
                        }
                    })
                    .collect();

                // Sort by filename for deterministic ordering
                sounds.sort_by(|a, b| a.name.cmp(&b.name));

                // Assign 1-based indices
                for (i, sound) in sounds.iter_mut().enumerate() {
                    sound.index = (i + 1) as u32;
                }

                let sound_count = sounds.len();
                let source_directories = panel_sources
                    .remove(&merge_key)
                    .unwrap_or_default();

                Panel {
                    name: panel_name,
                    color_category,
                    sounds,
                    sound_count,
                    source_directories,
                }
            })
            .collect();

        // Sort panels alphabetically
        panels.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(panels)
    }

    /// Scan a single panel directory for `.wav` files.
    /// Returns a list of (canonical_path, file_size_bytes).
    fn scan_panel_dir(dir: &Path) -> Result<Vec<(PathBuf, u64)>, AppError> {
        let entries = std::fs::read_dir(dir).map_err(|e| AppError::ScanFailed {
            reason: format!("Cannot read panel dir {}: {}", dir.display(), e),
        })?;

        let mut files = Vec::new();

        for entry in entries {
            let entry = entry.map_err(|e| AppError::ScanFailed {
                reason: e.to_string(),
            })?;

            let path = entry.path();

            if !validator::is_valid_sound_file(&path) {
                continue;
            }

            // Canonicalize the path
            let canonical = match std::fs::canonicalize(&path) {
                Ok(c) => c,
                Err(e) => {
                    log::warn!("Skipping {}: {}", path.display(), e);
                    continue;
                }
            };

            let size = std::fs::metadata(&canonical)
                .map(|m| m.len())
                .unwrap_or(0);

            files.push((canonical, size));
        }

        Ok(files)
    }

    /// Derive a display name from a directory or filename.
    /// Strips extension, replaces underscores/hyphens with spaces, capitalises each word.
    fn derive_display_name(raw: &str) -> String {
        raw.replace(['_', '-'], " ")
            .split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => {
                        let mut s = first.to_uppercase().to_string();
                        s.extend(chars);
                        s
                    }
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Derive a display name from a sound file path.
    /// Uses the file stem (no extension).
    fn derive_sound_name(path: &Path) -> String {
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown");
        Self::derive_display_name(stem)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;

    fn create_wav(dir: &Path, name: &str) {
        let path = dir.join(name);
        let mut f = fs::File::create(path).unwrap();
        f.write_all(&[0u8; 100]).unwrap();
    }

    #[test]
    fn discovers_panels_from_subdirectories() {
        let root = tempfile::tempdir().unwrap();
        let panel_a = root.path().join("Ambient");
        let panel_b = root.path().join("Crowd");
        fs::create_dir_all(&panel_a).unwrap();
        fs::create_dir_all(&panel_b).unwrap();

        create_wav(&panel_a, "rain.wav");
        create_wav(&panel_b, "applause.wav");
        create_wav(&panel_b, "cheering.wav");

        let panels = Scanner::scan_all(&[root.path().to_str().unwrap().to_string()]).unwrap();
        assert_eq!(panels.len(), 2);

        let ambient = panels.iter().find(|p| p.name == "Ambient").unwrap();
        assert_eq!(ambient.sound_count, 1);

        let crowd = panels.iter().find(|p| p.name == "Crowd").unwrap();
        assert_eq!(crowd.sound_count, 2);
    }

    #[test]
    fn skips_hidden_directories() {
        let root = tempfile::tempdir().unwrap();
        let visible = root.path().join("Bells");
        let hidden = root.path().join(".hidden");
        fs::create_dir_all(&visible).unwrap();
        fs::create_dir_all(&hidden).unwrap();

        create_wav(&visible, "ding.wav");
        create_wav(&hidden, "secret.wav");

        let panels = Scanner::scan_all(&[root.path().to_str().unwrap().to_string()]).unwrap();
        assert_eq!(panels.len(), 1);
        assert_eq!(panels[0].name, "Bells");
    }

    #[test]
    fn excludes_empty_panels() {
        let root = tempfile::tempdir().unwrap();
        let with_wav = root.path().join("Good");
        let empty = root.path().join("Empty");
        let non_wav = root.path().join("TextOnly");
        fs::create_dir_all(&with_wav).unwrap();
        fs::create_dir_all(&empty).unwrap();
        fs::create_dir_all(&non_wav).unwrap();

        create_wav(&with_wav, "sound.wav");
        // empty has no files
        // non_wav has only .txt
        fs::write(non_wav.join("readme.txt"), "not a sound").unwrap();

        let panels = Scanner::scan_all(&[root.path().to_str().unwrap().to_string()]).unwrap();
        assert_eq!(panels.len(), 1);
        assert_eq!(panels[0].name, "Good");
    }

    #[test]
    fn merges_panels_case_insensitively() {
        let root_a = tempfile::tempdir().unwrap();
        let root_b = tempfile::tempdir().unwrap();

        let panel_a = root_a.path().join("Ambient");
        let panel_b = root_b.path().join("ambient");
        fs::create_dir_all(&panel_a).unwrap();
        fs::create_dir_all(&panel_b).unwrap();

        create_wav(&panel_a, "rain.wav");
        create_wav(&panel_b, "wind.wav");

        let panels = Scanner::scan_all(&[
            root_a.path().to_str().unwrap().to_string(),
            root_b.path().to_str().unwrap().to_string(),
        ])
        .unwrap();

        assert_eq!(panels.len(), 1);
        assert_eq!(panels[0].sound_count, 2);
    }

    #[test]
    fn assigns_1_based_indices() {
        let root = tempfile::tempdir().unwrap();
        let panel = root.path().join("Test");
        fs::create_dir_all(&panel).unwrap();

        create_wav(&panel, "a.wav");
        create_wav(&panel, "b.wav");
        create_wav(&panel, "c.wav");

        let panels = Scanner::scan_all(&[root.path().to_str().unwrap().to_string()]).unwrap();
        let indices: Vec<u32> = panels[0].sounds.iter().map(|s| s.index).collect();
        assert_eq!(indices, vec![1, 2, 3]);
    }

    #[test]
    fn derive_display_name_works() {
        assert_eq!(Scanner::derive_display_name("my_cool_sound"), "My Cool Sound");
        assert_eq!(Scanner::derive_display_name("rain-forest"), "Rain Forest");
        assert_eq!(Scanner::derive_display_name("Ambient"), "Ambient");
    }
}
