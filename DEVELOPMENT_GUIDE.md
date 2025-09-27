# SoundBlart - Development Guide

## Prerequisites
- Flutter SDK installed and configured
- VS Code with Flutter extension
- Basic understanding of Dart/Flutter
- Project initialized at `~/Code/soundblart/soundblart/`

## Development Steps

### Phase 1: Project Setup and Dependencies

#### Step 1.1: Add Required Dependencies
Add to `pubspec.yaml`:
```yaml
dependencies:
  flutter:
    sdk: flutter
  audioplayers: ^5.2.1  # For audio playback
  path_provider: ^2.1.1 # For file system paths
  path: ^1.8.3         # For path manipulation
```

#### Step 1.2: Configure Desktop Support
Ensure desktop support is enabled:
```bash
flutter config --enable-windows-desktop
flutter config --enable-macos-desktop
```

#### Step 1.3: Platform-Specific Audio Setup
- **macOS**: Add audio permissions to `macos/Runner/Info.plist` if needed
- **Windows**: No special configuration required for audio playback

### Phase 2: Core Data Models

#### Step 2.1: Create Sound Model
Create `lib/models/sound.dart`:
- Properties: `filePath`, `name`, `isPlaying`
- Constructor to extract display name from filename

#### Step 2.2: Create Panel Model  
Create `lib/models/panel.dart`:
- Properties: `name`, `sounds` (List<Sound>)
- Method to load sounds from directory

### Phase 3: Audio Service Layer

#### Step 3.1: Create Audio Manager
Create `lib/services/audio_manager.dart`:
- Single AudioPlayer instance
- Methods: `playSound(String path)`, `stopSound()`, `setVolume(double value)`
- Handle toggle logic (stop if playing same sound, stop previous and play new)
- Track currently playing sound path

#### Step 3.2: Implement Volume Control
- Store volume as state (0.0 to 1.0)
- Apply volume to AudioPlayer instance
- Persist volume setting locally (optional)

### Phase 4: File System Service

#### Step 4.1: Create Sound Loader Service
Create `lib/services/sound_loader.dart`:
- Get soundbites directory path (`~/Code/soundblart/soundbites/`)
- Scan for subdirectories (these become panels)
- Load .wav files from each subdirectory
- Return Map<String, List<Sound>> (panel name -> sounds)

#### Step 4.2: Handle Path Resolution
- Expand `~` to home directory
- Handle platform-specific path separators
- Validate file existence

### Phase 5: Main UI Structure

#### Step 5.1: Create Main App Shell
Update `lib/main.dart`:
- MaterialApp with single home screen
- Fixed window size (recommended: 800x600)
- App title: "SoundBlart"

#### Step 5.2: Create Home Screen Layout
Create `lib/screens/home_screen.dart`:
- Column layout:
  - App header/title
  - Dropdown for panel selection
  - Sound grid (main content area)
  - Volume slider at bottom

### Phase 6: UI Components

#### Step 6.1: Create Panel Dropdown
Create `lib/widgets/panel_dropdown.dart`:
- DropdownButton with panel names
- Update selected panel in parent state
- Style: Clear labels, adequate padding

#### Step 6.2: Create Sound Grid
Create `lib/widgets/sound_grid.dart`:
- GridView with 3 columns
- Fixed aspect ratio for buttons (1:1 square)
- If ≤9 sounds: Show all with empty slots
- If >9 sounds: Enable vertical scrolling
- Empty slots: Disabled grey buttons

#### Step 6.3: Create Sound Button
Create `lib/widgets/sound_button.dart`:
- Display sound name (truncate if needed)
- Two states: default (grey/blue) and playing (green)
- OnTap: Toggle play/stop via AudioManager
- Elevated or Outlined button style

#### Step 6.4: Create Volume Slider
Create `lib/widgets/volume_slider.dart`:
- Horizontal slider (0-100%)
- Label: "Master Volume"
- Update AudioManager volume on change
- Show current volume percentage

### Phase 7: State Management

#### Step 7.1: Implement App State
Create `lib/state/app_state.dart` (using setState or Provider):
- Current panel selection
- All panels and sounds
- Currently playing sound
- Master volume level

#### Step 7.2: Wire Up State Changes
- Panel selection updates grid
- Button tap updates playing state
- Volume slider updates audio manager
- Playing state updates button appearance

### Phase 8: Application Logic Flow

#### Step 8.1: Startup Sequence
1. Initialize AudioManager
2. Load sounds from file system
3. Set default panel (first available)
4. Restore saved volume (if implemented)

#### Step 8.2: User Interaction Flow
1. **Panel Selection**: Dropdown → Update State → Refresh Grid
2. **Sound Play**: Button Tap → Stop Current → Play New → Update UI
3. **Sound Stop**: Button Tap → Stop Sound → Update UI
4. **Volume Change**: Slider → Update AudioManager → Save Setting

### Phase 9: Polish and Error Handling

#### Step 9.1: Error Handling
- Handle missing soundbites directory
- Handle empty panels
- Handle corrupted/invalid .wav files
- Show user-friendly error messages

#### Step 9.2: UI Polish
- Add app icon
- Consistent color scheme
- Smooth transitions
- Loading indicator during sound scan
- Tooltip on long sound names

### Phase 10: Testing

#### Step 10.1: Functional Testing
- Test all sound files play correctly
- Test toggle behavior
- Test panel switching
- Test volume control
- Test with 0, 1-9, and >9 sounds per panel

#### Step 10.2: Platform Testing
- Test on macOS
- Test on Windows
- Verify file paths work on both platforms
- Check audio latency

### Phase 11: Build and Distribution

#### Step 11.1: Build Release Versions
```bash
# macOS
flutter build macos --release

# Windows
flutter build windows --release
```

#### Step 11.2: Package for Distribution
- **macOS**: Create .dmg or .app bundle
- **Windows**: Create installer or portable .exe

## File Structure After Implementation
```
lib/
├── main.dart
├── models/
│   ├── sound.dart
│   └── panel.dart
├── services/
│   ├── audio_manager.dart
│   └── sound_loader.dart
├── screens/
│   └── home_screen.dart
├── widgets/
│   ├── panel_dropdown.dart
│   ├── sound_grid.dart
│   ├── sound_button.dart
│   └── volume_slider.dart
└── state/
    └── app_state.dart
```

## Key Implementation Notes

### Audio Playback
```dart
// Example using audioplayers
final player = AudioPlayer();
await player.play(DeviceFileSource(filePath));
await player.stop();
```

### File System Access
```dart
// Get home directory and construct path
final home = Platform.environment['HOME'] ?? Platform.environment['USERPROFILE'];
final soundbitesPath = path.join(home, 'Code', 'soundblart', 'soundbites');
```

### Grid Layout
```dart
GridView.builder(
  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 3,
    childAspectRatio: 1.0,
  ),
  itemCount: 9, // Always show 9 slots
  // ...
)
```

## Common Pitfalls to Avoid
1. Don't forget to dispose AudioPlayer when done
2. Handle platform-specific path separators
3. Don't block UI during file system scanning
4. Ensure proper error handling for missing files
5. Test with various audio file sizes
6. Remember to stop previous sound before playing new one

## Testing Checklist
- [ ] App launches successfully
- [ ] Panels load from file system
- [ ] Dropdown shows all panels
- [ ] Grid shows correct number of buttons
- [ ] Empty slots appear as disabled
- [ ] Sounds play when clicked
- [ ] Sounds stop when clicked again
- [ ] New sound stops previous sound
- [ ] Volume slider works
- [ ] Scrolling works for >9 sounds
- [ ] Works on macOS
- [ ] Works on Windows

## MVP Definition
The Minimum Viable Product includes:
- Load sounds from file system
- Display panels in dropdown
- Show 3x3 grid of sound buttons
- Play/stop sounds on click
- Master volume control
- Visual feedback for playing state

---
*This guide provides a complete roadmap for implementing SoundBlart v1.0*
*Follow phases sequentially for best results*
