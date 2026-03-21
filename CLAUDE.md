# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundBlart is a Flutter Desktop soundboard app for macOS and Windows. Users trigger `.wav` sound effects via a button grid during virtual meetings. The Flutter project lives in the `soundblart/` subdirectory — all `flutter` commands must be run from there.

## Commands

All commands run from `soundblart/`:

```bash
# Run on macOS
flutter run -d macos

# Run tests
flutter test

# Run a single test file
flutter test test/sound_loader_test.dart

# Build release
flutter build macos --release
flutter build windows --release

# Get dependencies
flutter pub get

# Analyze / lint
flutter analyze
```

## Architecture

### State Flow

`HomeScreen` owns a single `AppState` instance and rebuilds via `AnimatedBuilder`. There is no external state management package — plain `ChangeNotifier` + `setState`.

```
HomeScreen (AnimatedBuilder)
  └── AppState (ChangeNotifier)
        ├── SoundLoader       — scans filesystem, returns Map<panelName, List<Sound>>
        ├── AudioManager      — singleton, single AudioPlayer, toggle play/stop
        └── PresetInstaller   — copies bundled soundbites to app support dir on first run
```

### Sound Discovery

On startup, `AppState.init()` calls `PresetInstaller.ensureInstalled()` to determine the root sounds directory. If the developer's default path (`~/Code/soundblart/soundbites/`) exists, it copies `.wav` files to `<AppSupport>/SoundBlart/presets/` and persists that path via `shared_preferences`. Subsequent launches use the stored path.

`SoundLoader.loadPanels()` scans one or more root directories. Each non-hidden subdirectory becomes a **panel** (e.g., `Ambient/`, `Bells/`). Each `.wav` file within becomes a `Sound`. Multiple roots (added via the folder picker) are merged — panels with the same name across roots are combined.

### Audio

`AudioManager` is a singleton (`AudioManager.instance`) with a single `audioplayers` `AudioPlayer`. Calling `playSound(path)` stops whatever is playing first; calling it with the same path that's already playing stops it (toggle). `currentPath` tracks what's playing; `AppState.notify()` is called after toggle to rebuild the UI.

### UI Layout

`HomeScreen` renders a `Column`:
1. Diagnostics row (directory path, panel/sound counts)
2. `PanelDropdown` — selects the active panel
3. `SoundGrid` (expanded) — 3-column `GridView` of `SoundButton` widgets; always shows a minimum of 6 slots (3x2), scrollable for larger panels
4. `VolumeSlider` — master volume, 0.0–1.0

### Key Files

| Path | Purpose |
|---|---|
| `lib/state/app_state.dart` | Central state; owns loading, panel selection, volume, folder management |
| `lib/services/audio_manager.dart` | Singleton audio control |
| `lib/services/sound_loader.dart` | Filesystem scan → panel map |
| `lib/services/preset_installer.dart` | First-run copy of bundled soundbites |
| `lib/models/sound.dart` | `Sound` model; derives display name from filename |
| `lib/screens/home_screen.dart` | Top-level screen wiring AppState to widgets |

## Release

Releases are triggered by pushing a `v*` tag. CI (`.github/workflows/release.yml`) builds macOS and Windows and uploads zipped artifacts to the GitHub release.

## Soundbites Directory

Sound files live outside the Flutter project at `soundbites/` (repo root). Each subfolder is a panel. Only `.wav` files are loaded.
