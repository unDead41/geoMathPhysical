import 'dart:math' as math;
import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/design/design.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';

/// Browsing has no effect on the active module. Only the explicit button asks
/// the action owner to select a shape, so a swipe never replaces a live draft.
final class LearningShapeCarousel extends StatefulWidget {
  const LearningShapeCarousel({
    required this.options,
    required this.selectedId,
    required this.onSelected,
    super.key,
  }) : assert(options.length > 0);

  final List<ShapeOption> options;
  final String selectedId;
  final ValueChanged<String>? onSelected;

  @override
  State<LearningShapeCarousel> createState() => _LearningShapeCarouselState();
}

final class _LearningShapeCarouselState extends State<LearningShapeCarousel> {
  late final PageController _pages;
  late int _position;

  int get _selectedPosition {
    final index = widget.options.indexWhere(
      (item) => item.id == widget.selectedId,
    );
    return index < 0 ? 0 : index;
  }

  @override
  void initState() {
    super.initState();
    _position = _selectedPosition;
    _pages = PageController(initialPage: _position);
  }

  @override
  void didUpdateWidget(covariant LearningShapeCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedId != widget.selectedId ||
        _position >= widget.options.length) {
      _position = _selectedPosition;
      if (_pages.hasClients) _pages.jumpToPage(_position);
    }
  }

  void _browse(int position) {
    if (position < 0 || position >= widget.options.length) return;
    unawaited(GeoFeedback.selection(context));
    if (MediaQuery.disableAnimationsOf(context)) {
      _pages.jumpToPage(position);
    } else {
      _pages.animateToPage(
        position,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final colors = GeoMathColors.of(context);
    final theme = Theme.of(context);
    final current = widget.options[_position];
    final selected = current.id == widget.selectedId;
    return LayoutBuilder(
      builder: (context, constraints) {
        // Give every name its natural scaled height. No fixed line count or
        // shrinking is used for long BM names at a system text size of 150%.
        final nameStyle = theme.textTheme.titleMedium!;
        final nameHeight = widget.options.fold<double>(0, (height, option) {
          final painter = TextPainter(
            text: TextSpan(text: option.label, style: nameStyle),
            textDirection: Directionality.of(context),
            textScaler: MediaQuery.textScalerOf(context),
          )..layout(maxWidth: math.max(1, constraints.maxWidth - 32));
          final measuredHeight = painter.height;
          painter.dispose();
          return math.max(height, measuredHeight);
        });
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                IconButton(
                  key: const ValueKey('learning-shape-previous'),
                  constraints: const BoxConstraints.tightFor(
                    width: 48,
                    height: 48,
                  ),
                  tooltip: strings.text('learning.previousShape'),
                  onPressed: _position > 0
                      ? () => _browse(_position - 1)
                      : null,
                  icon: const Icon(Icons.chevron_left_rounded),
                ),
                Expanded(
                  child: Semantics(
                    liveRegion: true,
                    child: Text(
                      strings.text(
                        'learning.shapePosition',
                        parameters: {
                          'position': _position + 1,
                          'count': widget.options.length,
                        },
                      ),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.labelLarge,
                    ),
                  ),
                ),
                IconButton(
                  key: const ValueKey('learning-shape-next'),
                  constraints: const BoxConstraints.tightFor(
                    width: 48,
                    height: 48,
                  ),
                  tooltip: strings.text('learning.nextShape'),
                  onPressed: _position + 1 < widget.options.length
                      ? () => _browse(_position + 1)
                      : null,
                  icon: const Icon(Icons.chevron_right_rounded),
                ),
              ],
            ),
            SizedBox(
              height: nameHeight + 76,
              child: PageView.builder(
                key: const ValueKey('learning-shape-pages'),
                controller: _pages,
                allowImplicitScrolling: true,
                itemCount: widget.options.length,
                onPageChanged: (value) => setState(() => _position = value),
                itemBuilder: (context, index) {
                  final option = widget.options[index];
                  return Semantics(
                    selected: option.id == widget.selectedId,
                    child: DecoratedBox(
                      key: ValueKey('learning-shape-card-${option.id}'),
                      decoration: BoxDecoration(
                        color: option.id == widget.selectedId
                            ? colors.infoContainer
                            : colors.raised,
                        border: Border.all(
                          color: option.id == widget.selectedId
                              ? colors.primary
                              : colors.border,
                        ),
                        borderRadius: BorderRadius.circular(
                          GeoMathSpacing.controlRadius,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ExcludeSemantics(
                              child: Icon(
                                option.icon,
                                size: 32,
                                color: colors.primary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              option.label,
                              style: nameStyle,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            ActionButton(
              key: const ValueKey('learning-shape-select'),
              label: selected
                  ? strings.text(
                      'learning.activeShape',
                      parameters: {'shape': current.label},
                    )
                  : strings.text(
                      'learning.selectShape',
                      parameters: {'shape': current.label},
                    ),
              icon: selected
                  ? Icons.check_circle_outline_rounded
                  : Icons.check_rounded,
              kind: selected
                  ? ActionButtonKind.tonal
                  : ActionButtonKind.primary,
              onPressed: !selected && widget.onSelected != null
                  ? () {
                      unawaited(GeoFeedback.selection(context));
                      widget.onSelected!(current.id);
                    }
                  : null,
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }
}
