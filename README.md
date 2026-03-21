# SoundBlart

A desktop soundboard app for virtual meetings. Trigger `.wav` sound effects — applause, laughter, ambient sounds, and more — with a single click during a Zoom, Teams, or Google Meet call.

Supports **macOS** and **Windows**.

## Features

- Panel-based sound organization: each subfolder in your soundbites directory becomes a panel
- 3-column button grid with toggle play/stop; starting a new sound stops the current one
- Master volume slider
- Add extra sound folders at runtime via the folder picker
- First-run preset installer copies bundled sounds to your app support directory
- System light/dark theme support

## Quick Start

### Requirements

- Flutter 3.9+ with desktop support enabled
- macOS 13+ or Windows 10+
- macOS: Xcode + Command Line Tools (`xcode-select --install`)

### Run in development

```bash
cd soundblart
flutter pub get
flutter run -d macos     # or: -d windows
```

### Sound files

On first launch the app installs the bundled preset sounds from `soundbites/` (repo root) into your app support directory. Each subfolder becomes a panel; only `.wav` files are loaded.

You can also add extra sound folders at runtime using the **Add folder** button in the toolbar.

```
soundbites/
├── Ambient/      # Ambient sounds panel
├── Animals/      # Animal sounds panel
├── Bells/        # Bells & horns panel
├── Crowd/        # Crowd reactions panel
├── Funny/        # Funny sounds panel
└── Musical/      # Musical stings panel
```

After adding or removing `.wav` files, hit the **Refresh** button to reload.

## Building a Release

```bash
cd soundblart

# macOS — produces soundblart.app
flutter build macos --release

# Windows — produces an exe + supporting files
flutter build windows --release
```

Releases are built automatically by CI when a `v*` tag is pushed to `main`. Zipped artifacts are attached to the GitHub release.

## Repository Layout

```
soundblart/       # Flutter project (Dart source, pubspec.yaml, platform runners)
soundbites/       # Bundled preset .wav files, organized by category subfolder
designs/          # UI mockups and design files
```

## Development Notes

- All `flutter` commands must be run from the `soundblart/` subdirectory.
- macOS debug builds disable sandboxing (`DebugProfile.entitlements`) so the app can read files outside its bundle. Release builds remain sandboxed.
- Run tests: `flutter test` (from `soundblart/`)

See [CLAUDE.md](CLAUDE.md) for architecture details and [soundblart/README.md](soundblart/README.md) for additional troubleshooting.
