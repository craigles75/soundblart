import 'package:flutter/material.dart';

class PanelDropdown extends StatelessWidget {
  final List<String> panelNames;
  final String? selectedPanel;
  final ValueChanged<String?> onChanged;

  const PanelDropdown({
    super.key,
    required this.panelNames,
    required this.selectedPanel,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Text('Panel:'),
        const SizedBox(width: 12),
        Expanded(
          child: DropdownButton<String>(
            value: selectedPanel,
            isExpanded: true,
            hint: const Text('Select a panel'),
            items: panelNames
                .map(
                  (name) => DropdownMenuItem<String>(
                    value: name,
                    child: Text(name),
                  ),
                )
                .toList(),
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }
}


