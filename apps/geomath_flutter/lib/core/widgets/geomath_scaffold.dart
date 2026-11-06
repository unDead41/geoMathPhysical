import 'dart:math' as math;

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
    this.scrollKey = const PageStorageKey<String>('geomath-page-scroll'),
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
  final Key scrollKey;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
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
                  constraints: const BoxConstraints(
                    minWidth: 48,
                    minHeight: 48,
                  ),
                )
              : null,
          title: MediaQuery(
            data: MediaQuery.of(context),
            child: Semantics(
              header: true,
              child: Text(
                title,
                // AppBar applies its own scale cap and non-wrapping defaults.
                // Use the page's complete accessibility scale instead.
                textScaler: MediaQuery.textScalerOf(context),
                softWrap: true,
                overflow: TextOverflow.visible,
              ),
            ),
          ),
          toolbarHeight: _toolbarHeight(context, constraints.maxWidth),
          actions: actions.isEmpty
              ? null
              : [...actions, const SizedBox(width: 8)],
        ),
        body: SafeArea(
          top: false,
          child: scrollable
              ? _PageScrollView(
                  key: ValueKey(scrollKey),
                  storageKey: scrollKey,
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
    },
  );

  double _toolbarHeight(BuildContext context, double width) {
    final theme = Theme.of(context);
    final style =
        theme.appBarTheme.titleTextStyle ?? theme.textTheme.titleLarge;
    final leadingWidth = showBackButton || onBack != null ? 56.0 : 0.0;
    final titleWidth = math.max(
      48.0,
      width -
          leadingWidth -
          32 -
          actions.length * 48 -
          (actions.isEmpty ? 0 : 8),
    );
    final painter = TextPainter(
      text: TextSpan(text: title, style: style),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout(maxWidth: titleWidth);
    final height = math.max(72.0, painter.height + 24);
    painter.dispose();
    return height;
  }
}

/// Scroll offsets use an explicit identifier. A PageStorageKey on the scroll
/// view itself also becomes the implicit identifier of an unkeyed descendant
/// ExpansionTile, which then tries to read the offset double as a bool.
final class _PageScrollView extends StatefulWidget {
  const _PageScrollView({
    super.key,
    required this.storageKey,
    required this.padding,
    required this.child,
  });

  final Key storageKey;
  final EdgeInsetsGeometry padding;
  final Widget child;

  @override
  State<_PageScrollView> createState() => _PageScrollViewState();
}

final class _PageScrollViewState extends State<_PageScrollView> {
  late final _PageScrollController _controller = _PageScrollController(
    _ScrollOffsetIdentifier(widget.storageKey),
  );

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    controller: _controller,
    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
    padding: widget.padding,
    child: widget.child,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

@immutable
final class _ScrollOffsetIdentifier {
  const _ScrollOffsetIdentifier(this.key);

  final Key key;

  @override
  bool operator ==(Object other) =>
      other is _ScrollOffsetIdentifier && key == other.key;

  @override
  int get hashCode => Object.hash(_ScrollOffsetIdentifier, key);
}

final class _PageScrollController extends ScrollController {
  _PageScrollController(this.identifier);

  final _ScrollOffsetIdentifier identifier;

  @override
  ScrollPosition createScrollPosition(
    ScrollPhysics physics,
    ScrollContext context,
    ScrollPosition? oldPosition,
  ) => _PageScrollPosition(
    identifier: identifier,
    physics: physics,
    context: context,
    oldPosition: oldPosition,
  );
}

final class _PageScrollPosition extends ScrollPositionWithSingleContext {
  _PageScrollPosition({
    required this.identifier,
    required super.physics,
    required super.context,
    super.oldPosition,
  });

  final _ScrollOffsetIdentifier identifier;

  @override
  void saveScrollOffset() {
    PageStorage.maybeOf(context.storageContext)
        ?.writeState(context.storageContext, pixels, identifier: identifier);
  }

  @override
  void restoreScrollOffset() {
    if (hasPixels) return;
    final offset = PageStorage.maybeOf(context.storageContext)
        ?.readState(context.storageContext, identifier: identifier);
    if (offset is double) correctPixels(offset);
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
