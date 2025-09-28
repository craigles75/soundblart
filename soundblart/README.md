# SoundBlart

Desktop soundboard for virtual meetings. Load `.wav` files from your filesystem and trigger them via a simple 3×3 grid. One sound plays at a time, with toggle play/stop and a master volume slider.

## Requirements
- Flutter 3.9+ (desktop enabled)
- macOS 13+/Windows 10+
- macOS builds: Xcode and Command Line Tools installed (`xcode-select --install`)

## Sound files location
SoundBlart reads sounds from an external folder (not bundled in the app):

```
~/Code/soundblart/soundbites/
├── Ambient/
├── Bells/
├── Crowd/
└── Funny/
```

- Each subfolder becomes a panel
- Only `.wav` files are loaded
- Files are listed alphabetically

Tip: Click the Refresh button in the app after you add/remove files.

## Run (development)
macOS:
```
flutter run -d macos
```

Windows:
```
flutter run -d windows
```

Notes (macOS Debug): The app opens files outside the sandbox while debugging. This is enabled via `macos/Runner/DebugProfile.entitlements` (sandbox disabled in Debug only). Release builds remain sandboxed by default.

## Features
- Panel dropdown populated from subfolders
- 3×3 grid (pads with empty slots; scrolls if >9)
- Toggle play/stop; starting a new sound stops the current one
- Master volume slider
- Visual playing state
- Tooltips on long sound names
- Diagnostics row (folder path, counts), Refresh button

## Troubleshooting
- No panels or sounds found:
  - Ensure your `.wav` files are under `~/Code/soundblart/soundbites/<PanelName>/`
  - Use the Refresh button
  - macOS: ensure you run the Debug build to access external folders
- Playback error / file not found: The UI will show a SnackBar with details; verify the file still exists.

## Development
Install dependencies:
```
flutter pub get
```

Run the app:
```
flutter run -d macos   # or: -d windows
```

### Tests
We added unit tests for the file loader and app state. Audio is lazily instantiated to avoid platform channel issues in unit tests.
```
flutter test
```

### Project structure (key parts)
```
lib/
  main.dart
  models/
    sound.dart
    panel.dart
  services/
    audio_manager.dart
    sound_loader.dart
  state/
    app_state.dart
  screens/
    home_screen.dart
  widgets/
    panel_dropdown.dart
    sound_grid.dart
    sound_button.dart
    volume_slider.dart
```

## Build (release)
macOS:
```
flutter build macos --release
```

Windows:
```
flutter build windows --release
```

You can then package the generated artifacts for distribution (e.g., `.app`/`.dmg` on macOS, installer on Windows).
