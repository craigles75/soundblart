import 'dart:io';

import 'package:path/path.dart' as p;

import '../models/sound.dart';

/// Loads sounds from the external soundbites directory into panels.
class SoundLoader {
  /// Default location of the soundbites directory.
  /// On macOS/Windows we expand '~' using the HOME/USERPROFILE env var.
  static String defaultBasePath() {
    final home = Platform.environment['HOME'] ?? Platform.environment['USERPROFILE'] ?? '';
    if (home.isEmpty) {
      // Fallback to current working directory if HOME not found (unlikely on desktop)
      return p.join(Directory.current.path, 'Code', 'soundblart', 'soundbites');
    }
    return p.join(home, 'Code', 'soundblart', 'soundbites');
  }

  /// Expand '~' to the user's home directory if present.
  static String expandHome(String path) {
    if (path.startsWith('~')) {
      final home = Platform.environment['HOME'] ?? Platform.environment['USERPROFILE'] ?? '';
      if (home.isNotEmpty) {
        return p.normalize(p.join(home, path.substring(1)));
      }
    }
    return path;
  }

  /// Returns a map of panel name to list of [Sound] loaded from disk.
  ///
  /// [basePath] can override the default soundbites root. If omitted, we use
  /// `~/Code/soundblart/soundbites`.
  Future<Map<String, List<Sound>>> loadPanels({String? basePath}) async {
    final rootPath = expandHome(basePath ?? defaultBasePath());
    final rootDir = Directory(rootPath);

    if (!await rootDir.exists()) {
      return <String, List<Sound>>{}; // Gracefully return empty when missing
    }

    final Map<String, List<Sound>> panels = {};

    // List subdirectories (each subdirectory is a panel)
    final List<FileSystemEntity> entries = await rootDir.list().toList();
    for (final entity in entries) {
      if (entity is! Directory) continue;
      final String panelName = p.basename(entity.path);
      if (panelName.startsWith('.')) continue; // skip hidden dirs

      final List<Sound> sounds = await _loadWavFiles(entity);

      // Only include panels that have at least one sound
      if (sounds.isNotEmpty) {
        panels[panelName] = sounds;
      }
    }

    return panels;
  }

  Future<List<Sound>> _loadWavFiles(Directory panelDir) async {
    final List<FileSystemEntity> files = await panelDir.list().toList();
    final List<File> wavFiles = files
        .whereType<File>()
        .where((f) {
          final ext = p.extension(f.path).toLowerCase();
          return ext == '.wav';
        })
        .map((e) => File(e.path))
        .toList();

    // Sort by filename for deterministic ordering
    wavFiles.sort((a, b) => p.basename(a.path).compareTo(p.basename(b.path)));

    return wavFiles.map((f) => Sound(filePath: f.path)).toList();
  }
}



