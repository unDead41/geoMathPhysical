import 'package:flutter/material.dart';

import '../design/geomath_theme.dart';
import '../l10n/app_strings.dart';

/// Responsive native page shell. Persistent feature state belongs above this
/// widget; changing theme, text scale or strings only rebuilds presentation.
final class GeoMathScaffold extends StatelessWidget {
  const GeoMathScaffold({
    required this.title,
    required this.body,
    this.subtitle,
    this.actions = const [],
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.scrollable = true,
    this.showBackButton = false,
    this.onBack,
    this.backLabel,
    this.padding = const EdgeInsets.fromLTRB(20, 12, 20, 24),
    this.maxWidth,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget body;
  final List<Widget> actions;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final bool scrollable;
  final bool showBackButton;
  final VoidCallback? onBack;
  final String? backLabel;
  final EdgeInsetsGeometry padding;
  final double? maxWidth;

  @override
  Widget build(BuildContext context) {
    final colors = GeoMathColors.of(context);
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: scrollable ? MainAxisSize.min : MainAxisSize.max,
      children: [
        if (subtitle != null) ...[
          Text(
            subtitle!,
            style: Theme.of(context).textTheme.bodyLarge
                ?.copyWith(color: colors.muted),
          ),
          SizedBox(height: GeoMathSpacing.xl),
        ],
        if (scrollable) body else Expanded(child: body),
      ],
    );
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: showBackButton || onBack != null
            ? IconButton(
                tooltip:
                    backLabel ?? AppStrings.of(context).text('common.back'),
                onPressed: onBack ?? () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.arrow_back_rounded),
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              )
            : null,
        title: Semantics(header: true, child: Text(title)),
        actions: actions.isEmpty
            ? null
            : [...actions, const SizedBox(width: 8)],
      ),
      body: SafeArea(
        top: false,
        child: scrollable
            ? SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: padding,
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: maxWidth ?? GeoMathSpacing.contentMaxWidth,
                    ),
                    child: content,
                  ),
                ),
              )
            : Padding(
                padding: padding,
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: maxWidth ?? GeoMathSpacing.contentMaxWidth,
                    ),
                    child: content,
                  ),
                ),
              ),
      ),
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
    );
  }
}

final class GeoMathCard extends StatelessWidget {
  const GeoMathCard({
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.color,
    this.onTap,
    this.semanticLabel,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) => Semantics(
    label: semanticLabel,
    button: onTap != null,
    child: Card(
      color: color,
      clipBehavior: Clip.antiAlias,
      child: onTap == null
          ? Padding(padding: padding, child: child)
          : ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              child: InkWell(
                onTap: onTap,
                child: Padding(padding: padding, child: child),
              ),
            ),
    ),
  );
}

final class SectionHeader extends StatelessWidget {
  const SectionHeader({
    required this.title,
    this.subtitle,
    this.trailing,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final heading = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(title, style: Theme.of(context).textTheme.titleLarge),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: GeoMathColors.of(context).muted),
            ),
          ],
        ],
      );
      if (trailing == null) return heading;
      if (constraints.maxWidth < 420 ||
          MediaQuery.textScalerOf(context).scale(16) > 20) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [heading, const SizedBox(height: 8), trailing!],
        );
      }
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: heading),
          const SizedBox(width: 16),
          trailing!,
        ],
      );
    },
  );
}
