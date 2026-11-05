import 'package:flutter/material.dart';

import '../design/geomath_theme.dart';
import 'controls.dart';
import 'geomath_scaffold.dart';

enum StatusTone { info, success, warning, error, neutral }

final class StatusNotice extends StatelessWidget {
  const StatusNotice({
    required this.message,
    this.title,
    this.tone = StatusTone.info,
    this.action,
    this.icon,
    this.liveRegion = false,
    super.key,
  });

  final String message;
  final String? title;
  final StatusTone tone;
  final Widget? action;
  final IconData? icon;
  final bool liveRegion;

  @override
  Widget build(BuildContext context) {
    final colors = GeoMathColors.of(context);
    final (foreground, background, defaultIcon) = switch (tone) {
      StatusTone.info => (
        colors.primary,
        colors.infoContainer,
        Icons.info_outline_rounded,
      ),
      StatusTone.success => (
        colors.success,
        colors.successContainer,
        Icons.check_circle_outline_rounded,
      ),
      StatusTone.warning => (
        colors.warning,
        colors.warningContainer,
        Icons.warning_amber_rounded,
      ),
      StatusTone.error => (
        Theme.of(context).colorScheme.error,
        colors.dangerContainer,
        Icons.error_outline_rounded,
      ),
      StatusTone.neutral => (
        colors.muted,
        colors.field,
        Icons.info_outline_rounded,
      ),
    };
    return Semantics(
      container: true,
      liveRegion: liveRegion,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(GeoMathSpacing.controlRadius),
          border: Border.all(color: foreground.withValues(alpha: .35)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ExcludeSemantics(
                child: Icon(icon ?? defaultIcon, color: foreground, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (title != null) ...[
                      Text(
                        title!,
                        style: Theme.of(context).textTheme.labelLarge
                            ?.copyWith(color: foreground),
                      ),
                      const SizedBox(height: 4),
                    ],
                    Text(
                      message,
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: colors.ink),
                    ),
                    if (action != null) ...[
                      const SizedBox(height: 12),
                      action!,
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.title,
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.action,
    super.key,
  });

  final String title;
  final String message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) => GeoMathCard(
    child: Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: GeoMathColors.of(context).infoContainer,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(icon, color: GeoMathColors.of(context).primary, size: 30),
        ),
        const SizedBox(height: 16),
        Semantics(
          header: true,
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(color: GeoMathColors.of(context).muted),
        ),
        if (action != null) ...[const SizedBox(height: 20), action!],
      ],
    ),
  );
}

final class RetryPanel extends StatelessWidget {
  const RetryPanel({
    required this.title,
    required this.message,
    required this.retryLabel,
    required this.onRetry,
    this.busy = false,
    super.key,
  });

  final String title;
  final String message;
  final String retryLabel;
  final VoidCallback? onRetry;
  final bool busy;

  @override
  Widget build(BuildContext context) => StatusNotice(
    title: title,
    message: message,
    tone: StatusTone.error,
    liveRegion: true,
    action: ActionButton(
      label: retryLabel,
      onPressed: onRetry,
      busy: busy,
      kind: ActionButtonKind.secondary,
    ),
  );
}

final class SyncStatusBadge extends StatelessWidget {
  const SyncStatusBadge({
    required this.label,
    this.tone = StatusTone.neutral,
    super.key,
  });

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = GeoMathColors.of(context);
    final color = switch (tone) {
      StatusTone.info => colors.primary,
      StatusTone.success => colors.success,
      StatusTone.warning => colors.warning,
      StatusTone.error => Theme.of(context).colorScheme.error,
      StatusTone.neutral => colors.muted,
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: .4)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium
              ?.copyWith(color: color),
        ),
      ),
    );
  }
}
