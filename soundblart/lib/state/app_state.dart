import 'dart:io';
import 'package:flutter/foundation.dart';

import '../models/sound.dart';
import '../services/audio_manager.dart';
import '../services/sound_loader.dart';

/// Central application state for panels, selection, volume, and playback.
class AppState extends ChangeNotifier {
  AppState();

  final AudioManager _audio = AudioManager.instance;
  final SoundLoader _loader = SoundLoader();

  Map<String, List<Sound>> _panels = {};
  String? _selectedPanel;
  double _volume = 1.0;
  String _rootPath = '';
  bool _isLoading = false;
  String? _errorMessage;

  Map<String, List<Sound>> get panels => _panels;
  String? get selectedPanel => _selectedPanel;
  double get volume => _volume;
  String get rootPath => _rootPath;
  String? get currentPath => _audio.currentPath;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<Sound> get currentPanelSounds {
    if (_selectedPanel == null) return const <Sound>[];
    return _panels[_selectedPanel] ?? const <Sound>[];
  }

  Future<void> init() async {
    _volume = _audio.volume;
    _rootPath = SoundLoader.defaultBasePath();
    await refresh();
  }

  Future<void> refresh() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final rootDir = Directory(_rootPath);
      if (!await rootDir.exists()) {
        _panels = {};
        _selectedPanel = null;
        _errorMessage = 'Directory not found: ' + _rootPath;
      } else {
        final loaded = await _loader.loadPanels(basePath: _rootPath);
        _panels = loaded;
        _selectedPanel = loaded.keys.isNotEmpty ? loaded.keys.first : null;
        if (loaded.isEmpty) {
          _errorMessage = 'No panels or .wav files found in ' + _rootPath;
        }
      }
    } catch (e) {
      _errorMessage = 'Error loading sounds: ' + e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectPanel(String? name) {
    _selectedPanel = name;
    notifyListeners();
  }

  Future<void> setVolume(double value) async {
    await _audio.setVolume(value);
    _volume = value;
    notifyListeners();
  }

  Future<void> togglePlay(Sound sound) async {
    await _audio.playSound(sound.filePath);
    notifyListeners();
  }

  /// Manually trigger UI updates for listeners.
  void notify() {
    notifyListeners();
  }

  /// Opens the root soundbites folder in the OS file explorer.
  Future<void> openRootFolder() async {
    try {
      if (_rootPath.isEmpty) return;
      if (Platform.isMacOS) {
        await Process.run('open', <String>[_rootPath]);
      } else if (Platform.isWindows) {
        await Process.run('explorer', <String>[_rootPath]);
      } else if (Platform.isLinux) {
        await Process.run('xdg-open', <String>[_rootPath]);
      }
    } catch (_) {
      // No-op: best-effort
    }
  }

  /// Set root path (used by tests) and refresh.
  Future<void> setRootPathAndRefresh(String path) async {
    _rootPath = path;
    await refresh();
  }
}
