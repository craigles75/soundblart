import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

import 'package:soundblart/services/sound_loader.dart';

void main() {
  group('SoundLoader', () {
    late Directory tempRoot;

    setUp(() async {
      tempRoot = await Directory.systemTemp.createTemp('sound_loader_test_');
      // Create panels
      for (final panel in ['Ambient', 'Bells']) {
        final dir = Directory(p.join(tempRoot.path, panel));
        await dir.create(recursive: true);
        // valid wav
        await File(p.join(dir.path, 'One.wav')).writeAsBytes([0]);
        // invalid ext
        await File(p.join(dir.path, 'Skip.txt')).writeAsString('irrelevant');
      }
    });

    tearDown(() async {
      if (await tempRoot.exists()) {
        await tempRoot.delete(recursive: true);
      }
    });

    test('loads panels and wav files only', () async {
      final loader = SoundLoader();
      final panels = await loader.loadPanels(basePath: tempRoot.path);
      expect(panels.keys.toSet(), {'Ambient', 'Bells'});
      expect(panels['Ambient']!.length, 1);
      expect(panels['Bells']!.length, 1);
      expect(
        p.basenameWithoutExtension(panels['Ambient']!.first.filePath),
        'One',
      );
    });

    test('returns empty map when root missing', () async {
      final loader = SoundLoader();
      final panels = await loader.loadPanels(
        basePath: p.join(tempRoot.path, 'missing'),
      );
      expect(panels, isEmpty);
    });
  });
}
