import 'package:flutter/material.dart';

import '../models/sound.dart';
import '../services/audio_manager.dart';
import '../services/sound_loader.dart';
import '../widgets/panel_dropdown.dart';
import '../widgets/sound_grid.dart';
import '../widgets/volume_slider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AudioManager _audio = AudioManager.instance;
  final SoundLoader _loader = SoundLoader();

  Map<String, List<Sound>> _panels = {};
  String? _selectedPanel;
  double _volume = 1.0;
  String _rootPath = '';
  bool _rootExists = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final String root = SoundLoader.defaultBasePath();
    final panels = await _loader.loadPanels();
    if (!mounted) return;
    setState(() {
      _panels = panels;
      _selectedPanel = panels.keys.isNotEmpty ? panels.keys.first : null;
      _volume = _audio.volume;
      _rootPath = root;
      _rootExists = panels.isNotEmpty;
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<String> panelNames = _panels.keys.toList();
    final List<Sound> sounds = _selectedPanel != null
        ? (_panels[_selectedPanel] ?? [])
        : [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('SoundBlart'),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () async {
              await _init();
              if (!mounted) return;
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('Reloaded panels')));
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildDiagnostics(panelNames),
            const SizedBox(height: 12),
            PanelDropdown(
              panelNames: panelNames,
              selectedPanel: _selectedPanel,
              onChanged: (value) {
                setState(() {
                  _selectedPanel = value;
                });
              },
            ),
            const SizedBox(height: 16),
            Expanded(child: _buildMainArea(sounds)),
            const SizedBox(height: 16),
            VolumeSlider(
              value: _volume,
              onChanged: (v) async {
                setState(() {
                  _volume = v;
                });
                await _audio.setVolume(v);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiagnostics(List<String> panelNames) {
    final totalSounds = _panels.values.fold<int>(
      0,
      (sum, list) => sum + list.length,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Directory: $_rootPath', style: const TextStyle(fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          'Panels: ${panelNames.length}, Sounds: $totalSounds',
          style: const TextStyle(fontSize: 12),
        ),
        if (!_rootExists || panelNames.isEmpty)
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
    if (_panels.isEmpty) {
      return Center(
        child: Text(
          'No sounds found in:\n$_rootPath\n\nCreate subfolders (e.g., Ambient, Bells) and add .wav files.',
          textAlign: TextAlign.center,
        ),
      );
    }
    return SoundGrid(
      sounds: sounds,
      audio: _audio,
      onStateChanged: () {
        if (!mounted) return;
        setState(() {});
      },
    );
  }
}
