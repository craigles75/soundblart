import 'package:flutter/material.dart';

import '../models/sound.dart';
import '../state/app_state.dart';
import '../services/audio_manager.dart';
import '../widgets/panel_dropdown.dart';
import '../widgets/sound_grid.dart';
import '../widgets/volume_slider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AppState _state = AppState();

  @override
  void initState() {
    super.initState();
    _state.init();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _state,
      builder: (context, _) {
        final panelNames = _state.panels.keys.toList();
        final sounds = _state.currentPanelSounds;
        return Scaffold(
          appBar: AppBar(
            title: const Text('SoundBlart'),
            centerTitle: true,
            actions: [
              IconButton(
                tooltip: 'Refresh',
                onPressed: () async {
                  await _state.refresh();
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Reloaded panels')),
                  );
                },
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          body: _state.isLoading
              ? const Center(child: CircularProgressIndicator())
              : Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildDiagnostics(panelNames),
                const SizedBox(height: 12),
                PanelDropdown(
                  panelNames: panelNames,
                  selectedPanel: _state.selectedPanel,
                  onChanged: (value) {
                    _state.selectPanel(value);
                  },
                ),
                const SizedBox(height: 16),
                Expanded(child: _buildMainArea(sounds)),
                const SizedBox(height: 16),
                VolumeSlider(
                  value: _state.volume,
                  onChanged: (v) async {
                    await _state.setVolume(v);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDiagnostics(List<String> panelNames) {
    final totalSounds = _state.panels.values.fold<int>(
      0,
      (sum, list) => sum + list.length,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Directory: ${_state.rootPath}',
          style: const TextStyle(fontSize: 12),
        ),
        const SizedBox(height: 4),
        Text(
          'Panels: ${panelNames.length}, Sounds: $totalSounds',
          style: const TextStyle(fontSize: 12),
        ),
        if (_state.panels.isEmpty || panelNames.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8.0),
            child: Text(
              'No panels found. Ensure .wav files exist under subfolders in the soundbites directory.',
              style: TextStyle(fontSize: 12, color: Colors.redAccent),
            ),
          ),
      ],
    );
  }

  Widget _buildMainArea(List<Sound> sounds) {
    if (_state.panels.isEmpty) {
      return Center(
        child: Text(
          'No sounds found in:\n${_state.rootPath}\n\nCreate subfolders (e.g., Ambient, Bells) and add .wav files.',
          textAlign: TextAlign.center,
        ),
      );
    }
    return SoundGrid(
      sounds: sounds,
      audio: AudioManager.instance,
      onStateChanged: () {
        _state.notify();
      },
    );
  }
}
