import 'sound.dart';

/// Represents a collection of sounds under a named panel/category.
class Panel {
  /// Display name of the panel (e.g., "Ambient", "Bells").
  final String name;

  /// The sounds belonging to this panel.
  final List<Sound> sounds;

  Panel({required this.name, required this.sounds});
}


