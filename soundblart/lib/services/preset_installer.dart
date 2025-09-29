import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'sound_loader.dart';

/// Installs preset sounds into an application support folder on first run.
class PresetInstaller {
  static const String _kInstalledRootKey = 'preset_installed_root';

  /// Returns the path to the installed presets root, or null if not installed.
  static Future<String?> getInstalledRoot() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kInstalledRootKey);
  }

  /// Ensure presets are installed. If already installed, returns that path.
  ///
  /// For now, copies from the developer's default soundbites path if present.
  static Future<String?> ensureInstalled() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_kInstalledRootKey);
    if (existing != null && await Directory(existing).exists()) {
      return existing;
    }

    // Determine source: user's default soundbites folder
    final sourceRoot = SoundLoader.defaultBasePath();
    final sourceDir = Directory(sourceRoot);
    if (!await sourceDir.exists()) {
      return null; // nothing to install
    }

    // Destination under application support: <appSupport>/SoundBlart/presets
    final appSupport = await getApplicationSupportDirectory();
    final destRoot = p.join(appSupport.path, 'SoundBlart', 'presets');
    final destDir = Directory(destRoot);
    if (!await destDir.exists()) {
      await destDir.create(recursive: true);
    }

    await _copyWavTree(sourceDir, destDir);
    await prefs.setString(_kInstalledRootKey, destRoot);
    return destRoot;
  }

  static Future<void> _copyWavTree(Directory src, Directory dst) async {
    await for (final entity in src.list(recursive: true, followLinks: false)) {
      if (entity is File) {
        final ext = p.extension(entity.path).toLowerCase();
        if (ext != '.wav') continue;
        final rel = p.relative(entity.path, from: src.path);
        final outPath = p.join(dst.path, rel);
        await Directory(p.dirname(outPath)).create(recursive: true);
        await entity.copy(outPath);
      }
    }
  }
}


