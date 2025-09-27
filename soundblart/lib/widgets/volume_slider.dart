import 'package:flutter/material.dart';

class VolumeSlider extends StatelessWidget {
  final double value;
  final ValueChanged<double> onChanged;

  const VolumeSlider({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Master Volume'),
        Row(
          children: [
            Expanded(
              child: Slider(
                value: value,
                onChanged: onChanged,
              ),
            ),
            SizedBox(width: 48, child: Text('${(value * 100).round()}%')),
          ],
        ),
      ],
    );
  }
}


