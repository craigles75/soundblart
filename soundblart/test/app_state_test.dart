import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/widgets.dart';
import 'package:path/path.dart' as p;

import 'package:soundblart/state/app_state.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('AppState', () {
    late Directory tempRoot;

    setUp(() async {
      tempRoot = await Directory.systemTemp.createTemp('app_state_test_');
    });

    tearDown(() async {
      if (await tempRoot.exists()) {
        await tempRoot.delete(recursive: true);
      }
    });

    test('shows error when directory missing', () async {
      final appState = AppState();
      await appState.setRootPathAndRefresh(p.join(tempRoot.path, 'missing'));
      expect(appState.panels, isEmpty);
      expect(appState.errorMessage, contains('Directory not found'));
    });

    test('loads panels and selects first', () async {
      // Create two panels with one wav each
      final ambient = Directory(p.join(tempRoot.path, 'Ambient'));
      await ambient.create(recursive: true);
      await File(p.join(ambient.path, 'Rain.wav')).writeAsBytes([0]);

      final bells = Directory(p.join(tempRoot.path, 'Bells'));
      await bells.create(recursive: true);
      await File(p.join(bells.path, 'Ding.wav')).writeAsBytes([0]);

      final appState = AppState();
      await appState.setRootPathAndRefresh(tempRoot.path);

      expect(appState.panels.keys.length, 2);
      expect(appState.selectedPanel, isNotNull);
      expect(appState.currentPanelSounds, isNotEmpty);
      expect(appState.errorMessage, isNull);
    });
  });
}
