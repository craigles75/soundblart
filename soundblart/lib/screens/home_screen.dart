import 'dart:io';
import 'package:flutter/material.dart';

import '../models/sound.dart';
import '../services/audio_manager.dart';
import '../services/sound_loader.dart';

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
    final List<Sound> sounds = _selectedPanel != null ? (_panels[_selectedPanel] ?? []) : [];

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
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Reloaded panels')),
              );
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
            Row(
              children: [
                const Text('Panel:'),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButton<String>(
                    value: _selectedPanel,
                    isExpanded: true,
                    hint: const Text('Select a panel'),
                    items: panelNames
                        .map((name) => DropdownMenuItem<String>(
                              value: name,
                              child: Text(name),
                            ))
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedPanel = value;
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(child: _buildMainArea(sounds)),
            const SizedBox(height: 16),
            _buildVolumeSlider(),
          ],
        ),
      ),
    );
  }

  Widget _buildDiagnostics(List<String> panelNames) {
    final totalSounds = _panels.values.fold<int>(0, (sum, list) => sum + list.length);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Directory: $_rootPath', style: const TextStyle(fontSize: 12)),
        const SizedBox(height: 4),
        Text('Panels: ${panelNames.length}, Sounds: $totalSounds', style: const TextStyle(fontSize: 12)),
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
    return _buildSoundGrid(sounds);
  }

  Widget _buildVolumeSlider() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Master Volume'),
        Row(
          children: [
            Expanded(
              child: Slider(
                value: _volume,
                onChanged: (v) async {
                  setState(() {
                    _volume = v;
                  });
                  await _audio.setVolume(v);
                },
              ),
            ),
            SizedBox(
              width: 48,
              child: Text('${(_volume * 100).round()}%'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSoundGrid(List<Sound> sounds) {
    // Always show 3x3 grid, pad with empty slots if fewer than 9
    const int gridSlots = 9;
    final int itemCount = sounds.length < gridSlots ? gridSlots : sounds.length;

    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 1.0,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        if (index >= sounds.length) {
          return const _EmptySlot();
        }
        final sound = sounds[index];
        final bool isPlaying = _audio.currentPath == sound.filePath;
        return ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: isPlaying ? Colors.green : null,
          ),
          onPressed: () async {
            try {
              final file = File(sound.filePath);
              final exists = await file.exists();
              if (!exists) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('File not found: ${sound.filePath}')),
                );
                return;
              }

              await _audio.playSound(sound.filePath);
              if (!mounted) return;
              setState(() {});
            } catch (e) {
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Playback error: $e')),
              );
            }
          },
          child: Text(
            sound.name,
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            maxLines: 2,
          ),
        );
      },
    );
  }
}

class _EmptySlot extends StatelessWidget {
  const _EmptySlot();

  @override
  Widget build(BuildContext context) {
    return const AbsorbPointer(
      child: DecoratedBox(
        decoration: BoxDecoration(color: Color(0xFFE0E0E0)),
        child: SizedBox.expand(),
      ),
    );
  }
}



