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
          child: DropdownButtonFormField<String>(
            value: selectedPanel,
            isExpanded: true,
            decoration: const InputDecoration(
              hintText: 'Select a panel',
              isDense: true,
            ),
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
