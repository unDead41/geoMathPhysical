import 'package:flutter/material.dart';

import '../design/geomath_theme.dart';

@immutable
final class GeoDestination {
  const GeoDestination({
    required this.id,
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String id;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Navigation preserves platform-scaled text. When five labels would need more
/// than two lines, the current label gets the full width above named targets.
final class GeoDestinationBar extends StatelessWidget {
  const GeoDestinationBar({
    super.key,
    required this.destinations,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<GeoDestination> destinations;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = GeoMathColors.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final labelStyle = Theme.of(context).textTheme.labelMedium!;
        final labelWidth = constraints.maxWidth / destinations.length - 8;
        final compactLabels = destinations.any((destination) {
          final painter = TextPainter(
            text: TextSpan(text: destination.label, style: labelStyle),
            textDirection: Directionality.of(context),
            textScaler: MediaQuery.textScalerOf(context),
          )..layout();
          final tooWide = painter.width > labelWidth * 2;
          painter.dispose();
          return tooWide;
        });
        return Material(
          color: Theme.of(context).colorScheme.surface,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: colors.border)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (compactLabels)
                    ExcludeSemantics(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                        child: Text(
                          destinations[selectedIndex].label,
                          textAlign: TextAlign.center,
                          style: labelStyle.copyWith(color: colors.primary),
                        ),
                      ),
                    ),
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        for (
                          var index = 0;
                          index < destinations.length;
                          index++
                        )
                          Expanded(
                            child: Semantics(
                              label: destinations[index].label,
                              button: true,
                              selected: index == selectedIndex,
                              child: Tooltip(
                                message: destinations[index].label,
                                excludeFromSemantics: true,
                                child: InkWell(
                                  key: ValueKey(
                                    'nav-${destinations[index].id}',
                                  ),
                                  onTap: () => onSelected(index),
                                  child: ExcludeSemantics(
                                    child: ConstrainedBox(
                                      constraints: BoxConstraints(
                                        minHeight: compactLabels ? 64 : 80,
                                        minWidth: GeoMathSpacing.touchTarget,
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 4,
                                          vertical: 10,
                                        ),
                                        child: Column(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            AnimatedContainer(
                                              duration: GeoMathMotion.duration(
                                                context,
                                              ),
                                              width: 56,
                                              height: 32,
                                              decoration: BoxDecoration(
                                                color: index == selectedIndex
                                                    ? colors.infoContainer
                                                    : Colors.transparent,
                                                borderRadius:
                                                    BorderRadius.circular(16),
                                              ),
                                              child: Icon(
                                                index == selectedIndex
                                                    ? destinations[index]
                                                          .selectedIcon
                                                    : destinations[index].icon,
                                                color: index == selectedIndex
                                                    ? colors.primary
                                                    : colors.muted,
                                              ),
                                            ),
                                            if (!compactLabels) ...[
                                              const SizedBox(height: 4),
                                              Text(
                                                destinations[index].label,
                                                textAlign: TextAlign.center,
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .labelMedium
                                                    ?.copyWith(
                                                      color:
                                                          index == selectedIndex
                                                          ? colors.primary
                                                          : colors.muted,
                                                    ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
