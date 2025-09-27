import 'package:flutter/material.dart';

import '../models/sound.dart';
import '../services/audio_manager.dart';
import 'sound_button.dart';

class SoundGrid extends StatelessWidget {
  final List<Sound> sounds;
  final AudioManager audio;
  final VoidCallback onStateChanged;

  const SoundGrid({
    super.key,
    required this.sounds,
    required this.audio,
    required this.onStateChanged,
  });

  @override
  Widget build(BuildContext context) {
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
        return SoundButton(
          sound: sounds[index],
          audio: audio,
          onStateChanged: onStateChanged,
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


