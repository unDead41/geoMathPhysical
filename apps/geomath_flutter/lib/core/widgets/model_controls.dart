import 'package:flutter/material.dart';

import '../design/geomath_theme.dart';
import 'controls.dart';

@immutable
final class ShapeOption {
  const ShapeOption({
    required this.id,
    required this.label,
    this.icon = Icons.view_in_ar_outlined,
  });

  final String id;
  final String label;
  final IconData icon;
}

final class ShapeSelector extends StatelessWidget {
  const ShapeSelector({
    required this.options,
    required this.selectedId,
    required this.onSelected,
    this.label,
    this.enabled = true,
    super.key,
  });

  final List<ShapeOption> options;
  final String selectedId;
  final ValueChanged<String>? onSelected;
  final String? label;
  final bool enabled;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      if (label != null) ...[
        Text(label!, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 10),
      ],
      ChoiceChips<String>(
        options: [
          for (final option in options)
            ChoiceChipOption(
              value: option.id,
              label: option.label,
              icon: option.icon,
            ),
        ],
        selected: selectedId,
        onSelected: onSelected,
        enabled: enabled,
      ),
    ],
  );
}

@immutable
final class ModelToolbarAction {
  const ModelToolbarAction({
    required this.id,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.selected = false,
  });

  final String id;
  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final bool selected;
}

final class ModelToolbar extends StatelessWidget {
  const ModelToolbar({required this.actions, super.key});

  final List<ModelToolbarAction> actions;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final action in actions)
        Semantics(
          selected: action.selected,
          child: ActionButton(
            key: ValueKey('model-action-${action.id}'),
            label: action.label,
            icon: action.icon,
            onPressed: action.onPressed,
            kind: action.selected
                ? ActionButtonKind.tonal
                : ActionButtonKind.secondary,
            expanded: false,
          ),
        ),
    ],
  );
}

@immutable
final class FaceLegendEntry {
  const FaceLegendEntry({
    required this.id,
    required this.label,
    required this.color,
  });

  final String id;
  final String label;
  final Color color;
}

/// Explicit real-surface entries; this widget never infers faces from a mesh's
/// polygons or a camera. Labels keep the legend usable without colour vision.
final class FaceLegend extends StatelessWidget {
  const FaceLegend({required this.entries, this.title, super.key});

  final List<FaceLegendEntry> entries;
  final String? title;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      if (title != null) ...[
        Text(title!, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
      ],
      Wrap(
        spacing: 16,
        runSpacing: 10,
        children: [
          for (final entry in entries)
            Semantics(
              label: entry.label,
              excludeSemantics: true,
              child: Row(
                key: ValueKey('face-legend-${entry.id}'),
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: entry.color,
                      border: Border.all(
                        color: GeoMathColors.of(context).controlBorder,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 7),
                  Flexible(
                    child: Text(
                      entry.label,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    ],
  );
}
