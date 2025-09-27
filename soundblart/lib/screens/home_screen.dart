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

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final panels = await _loader.loadPanels();
    if (!mounted) return;
    setState(() {
      _panels = panels;
      _selectedPanel = panels.keys.isNotEmpty ? panels.keys.first : null;
      _volume = _audio.volume;
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
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
            Expanded(
              child: _buildSoundGrid(sounds),
            ),
            const SizedBox(height: 16),
            _buildVolumeSlider(),
          ],
        ),
      ),
    );
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
            await _audio.playSound(sound.filePath);
            setState(() {});
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


