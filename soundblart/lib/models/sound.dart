import 'package:path/path.dart' as p;

/// Represents a single sound effect on the soundboard.
class Sound {
  /// Absolute path to the sound file on disk.
  final String filePath;

  /// Display name derived from the file name (without extension).
  final String name;

  /// Whether this sound is currently playing.
  bool isPlaying;

  Sound({
    required this.filePath,
    bool isPlaying = false,
  })  : name = _deriveName(filePath),
        isPlaying = isPlaying;

  static String _deriveName(String filePath) {
    final base = p.basenameWithoutExtension(filePath);
    return base.trim();
  }
}


