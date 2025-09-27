import 'dart:io';

import 'package:flutter/material.dart';

import '../models/sound.dart';
import '../services/audio_manager.dart';

class SoundButton extends StatelessWidget {
  final Sound sound;
  final AudioManager audio;
  final VoidCallback onStateChanged;

  const SoundButton({
    super.key,
    required this.sound,
    required this.audio,
    required this.onStateChanged,
  });

  @override
  Widget build(BuildContext context) {
    final bool isPlaying = audio.currentPath == sound.filePath;
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: isPlaying ? Colors.green : null,
        padding: const EdgeInsets.all(14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
        ),
        elevation: isPlaying ? 2 : 1,
      ),
      onPressed: () async {
        try {
          final exists = await File(sound.filePath).exists();
          if (!exists) {
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('File not found: ${sound.filePath}')),
            );
            return;
          }
          await audio.playSound(sound.filePath);
          onStateChanged();
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Playback error: $e')));
        }
      },
      child: Tooltip(
        message: sound.name,
        waitDuration: const Duration(milliseconds: 600),
        child: Text(
          sound.name,
          textAlign: TextAlign.center,
          overflow: TextOverflow.ellipsis,
          maxLines: 2,
        ),
      ),
    );
  }
}
