import 'dart:async';
import 'package:audioplayers/audioplayers.dart';

/// Centralized audio control for the application.
///
/// - Maintains a single [AudioPlayer] instance
/// - Provides toggle play/stop behavior
/// - Tracks the currently playing file path
/// - Exposes a master volume in the range [0.0, 1.0]
class AudioManager {
  AudioManager._internal();

  /// Singleton instance to be used app-wide.
  static final AudioManager instance = AudioManager._internal();

  AudioPlayer? _player;
  final StreamController<void> _onCompleteController =
      StreamController<void>.broadcast();
  AudioPlayer _getPlayer() {
    final existing = _player;
    if (existing != null) return existing;
    final created = AudioPlayer();
    created.onPlayerComplete.listen((_) {
      _currentPath = null;
      _onCompleteController.add(null);
    });
    _player = created;
    return created;
  }

  String? _currentPath;
  double _volume = 1.0;

  /// The absolute path of the file currently playing (if any).
  String? get currentPath => _currentPath;

  /// Stream that emits when playback completes.
  Stream<void> get onComplete => _onCompleteController.stream;

  /// Master volume, clamped to [0.0, 1.0].
  double get volume => _volume;

  /// Sets the master volume. Values are clamped to [0.0, 1.0].
  Future<void> setVolume(double value) async {
    final double clamped = value.clamp(0.0, 1.0);
    _volume = clamped;
    await _getPlayer().setVolume(_volume);
  }

  /// Stops any currently playing sound and clears the current path.
  Future<void> stopSound() async {
    await _getPlayer().stop();
    _currentPath = null;
  }

  /// Toggle play/stop the given [path].
  ///
  /// - If the same file is already playing, this stops playback.
  /// - If a different file is playing, it stops that and plays the new one.
  Future<void> playSound(String path) async {
    if (_currentPath == path) {
      await stopSound();
      return;
    }

    // Stop whatever is currently playing
    await _getPlayer().stop();

    _currentPath = path;
    final player = _getPlayer();
    await player.setVolume(_volume);
    await player.play(DeviceFileSource(path));
  }

  /// Release player resources when the app is shutting down.
  Future<void> dispose() async {
    final p = _player;
    if (p != null) {
      await p.dispose();
      _player = null;
    }
    await _onCompleteController.close();
  }
}
