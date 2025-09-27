# SoundBlart - Project Overview

## Executive Summary
SoundBlart is a desktop soundboard application designed for enhancing virtual meetings with audio effects. Users can trigger sound effects like applause, laughter, or ambient sounds with a single click through an intuitive 3x3 button grid interface.

## Target Use Case
- **Primary Use**: Virtual meeting enhancement (Zoom, Teams, Google Meet, etc.)
- **User Profile**: Meeting hosts, presenters, educators who want to add engaging audio elements
- **Key Scenarios**: 
  - Adding applause when someone shares good news
  - Playing a "bingo" sound for achievements
  - Adding ambient background sounds
  - Injecting humor with sound effects

## Core Features

### 1. Sound Organization
- **Panel System**: Sounds organized into categories based on folder structure
- **Dropdown Navigation**: Simple dropdown selector to switch between panels
- **File-Based**: Reads .wav files from `~/Code/soundblart/soundbites/` directory
- **Auto-Discovery**: Automatically scans folders on startup

### 2. Playback Control
- **Toggle Mode**: Click to play, click again to stop
- **Single Stream**: Only one sound plays at a time (new sound stops previous)
- **Instant Response**: Optimized for low-latency playback during live meetings

### 3. User Interface
- **Fixed Grid**: 3x3 button layout (9 buttons visible)
- **Scrollable**: Vertical scroll for panels with >9 sounds (maintains 3-column layout)
- **Visual Feedback**: Color change to indicate playing state
- **Master Volume**: Single volume slider controlling all audio output

## Technical Decisions

### Platform Support
- **Desktop Only**: macOS and Windows
- **No Web Support**: Simplified architecture, better file system access

### Technology Stack
- **Framework**: Flutter Desktop
- **Language**: Dart
- **Audio Library**: audioplayers package
- **IDE**: VS Code

### Architecture Choices
- **Folder-Based Organization**: Each subfolder in `soundbites/` becomes a panel
- **Auto-Scan on Startup**: Discovers sounds automatically, no manual import
- **Stateless Sound Management**: No complex state management, simple play/stop

### UI/UX Decisions
- **Single Panel View**: One panel visible at a time via dropdown
- **Fixed Grid**: Always shows 3x3 grid, empty slots visible
- **Simple Visual Feedback**: Color change only (green=playing, default=stopped)
- **No Overlap**: Playing a new sound stops the current one

## Project Structure
```
~/Code/soundblart/
├── soundblart/           # Flutter project root
│   ├── lib/              # Dart source code
│   ├── assets/           # Embedded assets (if needed)
│   └── ...               # Other Flutter files
├── soundbites/           # Audio files directory
│   ├── Ambient/          # Ambient sounds panel
│   ├── Bells/            # Bell sounds panel
│   ├── Crowd/            # Crowd sounds panel
│   └── Funny/            # Funny sounds panel
├── PROJECT_OVERVIEW.md   # This document
└── DEVELOPMENT_GUIDE.md  # Step-by-step implementation guide
```

## Current Assets
- **Ambient Panel**: 5 sounds (Frogs, Ocean Waves, Rain, Storm, Thunder)
- **Bells Panel**: TBD
- **Crowd Panel**: TBD  
- **Funny Panel**: 3 sounds (Beer Can Opening, Fart, Pour Glass Water)

## Design Constraints
1. **Maximum 9 sounds visible** per panel without scrolling
2. **WAV format only** for audio files
3. **Single audio stream** - no sound mixing/layering
4. **File system dependent** - requires local file access

## Success Criteria
- Application launches in <2 seconds
- Sound playback latency <100ms
- Clear visual feedback for playing state
- Intuitive navigation between sound panels
- Reliable play/stop toggling
- Smooth volume control

## Future Considerations (Out of Scope for V1)
- Custom panel creation
- Tag-based organization
- Per-button volume controls
- Sound recording/editing
- MIDI controller support
- Hotkey assignments
- Multiple simultaneous sounds
- Export/share sound configurations

## Development Status
- [x] Project setup
- [x] Requirements gathering
- [x] Technical decisions
- [ ] Implementation
- [ ] Testing
- [ ] Packaging/distribution

---
*Last Updated: [Current Date]*
*Version: 1.0 - Initial Requirements*
