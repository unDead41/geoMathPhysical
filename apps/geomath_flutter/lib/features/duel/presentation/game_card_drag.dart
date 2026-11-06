import 'package:flutter/material.dart';

import '../../../core/design/geomath_theme.dart';
import '../../../core/geometry/geometry_card_provider.dart';

/// Presentation-only selection. The scope includes the actor, attempt/session,
/// question and stage; a drop never invokes a scan or changes the game engine.
@immutable
final class GameCardDragData {
  const GameCardDragData({
    required this.scopeKey,
    required this.shape,
    required this.kind,
  });

  final Object scopeKey;
  final GeometryShape shape;
  final GeometryCardKind kind;
}

/// Long press separates card dragging from the carousel's horizontal swipe.
/// The wrapped card retains its ordinary tap and accessibility actions.
final class GameCardDraggable extends StatelessWidget {
  const GameCardDraggable({
    super.key,
    required this.data,
    required this.enabled,
    required this.label,
    required this.child,
  });

  final GameCardDragData data;
  final bool enabled;
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => LongPressDraggable<GameCardDragData>(
    data: data,
    maxSimultaneousDrags: enabled ? 1 : 0,
    hapticFeedbackOnStart: false,
    feedback: Material(
      elevation: 6,
      color: Theme.of(context).colorScheme.surfaceContainerHigh,
      borderRadius: BorderRadius.circular(GeoMathSpacing.cardRadius),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 180),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.style_outlined),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
    childWhenDragging: Opacity(opacity: .55, child: child),
    child: child,
  );
}

/// Only the current, enabled reader accepts a matching scoped card. A caller
/// must recheck live route/controller state both on entry and on acceptance.
final class GameReaderTarget extends StatelessWidget {
  const GameReaderTarget({
    super.key,
    required this.scopeKey,
    required this.kind,
    required this.active,
    required this.canSelect,
    required this.onSelected,
    required this.title,
    required this.message,
    required this.child,
    this.selection,
  });

  final Object scopeKey;
  final GeometryCardKind kind;
  final bool active;
  final bool Function() canSelect;
  final ValueChanged<GeometryShape> onSelected;
  final String title, message;
  final String? selection;
  final Widget child;

  bool _accepts(GameCardDragData data) =>
      active && data.scopeKey == scopeKey && data.kind == kind && canSelect();

  @override
  Widget build(BuildContext context) => DragTarget<GameCardDragData>(
    onWillAcceptWithDetails: (details) => _accepts(details.data),
    onAcceptWithDetails: (details) {
      if (_accepts(details.data)) onSelected(details.data.shape);
    },
    builder: (context, candidates, rejected) {
      final colors = Theme.of(context).colorScheme;
      return DecoratedBox(
        decoration: BoxDecoration(
          color: active ? colors.primaryContainer : colors.surfaceContainerLow,
          border: Border.all(
            color: candidates.isNotEmpty ? colors.primary : colors.outline,
            width: candidates.isNotEmpty ? 3 : 1,
          ),
          borderRadius: BorderRadius.circular(GeoMathSpacing.cardRadius),
        ),
        child: Padding(
          // A fixed inset keeps drag highlighting from moving the scan action.
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    active ? Icons.contactless_outlined : Icons.lock_outline,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(message),
              if (selection != null) ...[
                const SizedBox(height: 8),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    selection!,
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              child,
            ],
          ),
        ),
      );
    },
  );
}
