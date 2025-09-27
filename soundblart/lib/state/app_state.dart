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

  Map<String, List<Sound>> get panels => _panels;
  String? get selectedPanel => _selectedPanel;
  double get volume => _volume;
  String get rootPath => _rootPath;
  String? get currentPath => _audio.currentPath;

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
    final loaded = await _loader.loadPanels();
    _panels = loaded;
    _selectedPanel = loaded.keys.isNotEmpty ? loaded.keys.first : null;
    notifyListeners();
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
}


