import 'package:flutter/material.dart';

class Logo extends StatelessWidget {
  final double iconSize;
  final TextStyle? textStyle;

  const Logo({super.key, this.iconSize = 22, this.textStyle});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.graphic_eq, color: color, size: iconSize),
        const SizedBox(width: 8),
        Text(
          'SoundBlart',
          style: textStyle ?? Theme.of(context).textTheme.titleLarge,
        ),
      ],
    );
  }
}
