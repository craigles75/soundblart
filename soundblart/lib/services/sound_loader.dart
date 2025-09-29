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
  /// [basePath] can override the default soundbites root OR provide a list of
  /// roots to merge.
  Future<Map<String, List<Sound>>> loadPanels({String? basePath, List<String>? roots}) async {
    final List<String> rootPaths = roots != null && roots.isNotEmpty
        ? roots.map(expandHome).toList()
        : [expandHome(basePath ?? defaultBasePath())];

    final Map<String, List<Sound>> panels = {};

    for (final rootPath in rootPaths) {
      final rootDir = Directory(rootPath);
      if (!await rootDir.exists()) {
        continue;
      }
      final List<FileSystemEntity> entries = await rootDir.list().toList();
      for (final entity in entries) {
        if (entity is! Directory) continue;
        final String panelName = p.basename(entity.path);
        if (panelName.startsWith('.')) continue;
        final List<Sound> sounds = await _loadWavFiles(entity);
        if (sounds.isEmpty) continue;
        panels.update(panelName, (existing) => [...existing, ...sounds], ifAbsent: () => sounds);
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



