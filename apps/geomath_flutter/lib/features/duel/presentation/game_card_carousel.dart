import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/design/geomath_theme.dart';

/// Browses public game choices without changing the caller's selection.
///
/// Every card stays in the tree so its existing key, semantics, and tap action
/// remain available to callers and [Scrollable.ensureVisible].
class GameCardCarousel extends StatefulWidget {
  const GameCardCarousel({
    super.key,
    required this.scopeKey,
    required this.keyPrefix,
    required this.itemCount,
    required this.cardBuilder,
    required this.previousLabel,
    required this.nextLabel,
    required this.positionLabel,
    this.reducedMotion = false,
  });

  final Object scopeKey;
  final String keyPrefix;
  final int itemCount;
  final Widget Function(BuildContext context, int index, double cardWidth)
  cardBuilder;
  final String previousLabel;
  final String nextLabel;
  final String Function(int oneBasedIndex, int count) positionLabel;
  final bool reducedMotion;

  @override
  State<GameCardCarousel> createState() => _GameCardCarouselState();
}

class _GameCardCarouselState extends State<GameCardCarousel> {
  static const _gap = 12.0;
  static const _peek = 48.0;
  final _scroll = ScrollController(keepScrollOffset: false);
  double _stride = 1;
  int _index = 0;
  int _scopeGeneration = 0;
  int _alignmentGeneration = 0;
  bool _aligning = false, _snapScheduled = false;

  int get _count => math.max(0, widget.itemCount);

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_updatePosition);
  }

  @override
  void didUpdateWidget(GameCardCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scopeKey != widget.scopeKey) {
      _index = 0;
      _scopeGeneration++;
      _alignAfterLayout();
    } else if (oldWidget.itemCount != widget.itemCount) {
      _index = _index.clamp(0, math.max(0, _count - 1));
      _alignAfterLayout();
    }
  }

  // Keep the browsed card, rather than its old pixel offset, when a phone
  // rotates or the available width changes. Ignore intermediate layout offsets.
  void _alignAfterLayout() {
    _aligning = true;
    final generation = ++_alignmentGeneration;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || generation != _alignmentGeneration) return;
      if (_scroll.hasClients) _scroll.jumpTo(_offsetFor(_index));
      _aligning = false;
    });
  }

  void _updatePosition() {
    if (!_scroll.hasClients || _aligning) return;
    final index = (_scroll.offset / _stride)
        .round()
        .clamp(0, math.max(0, _count - 1))
        .toInt();
    if (index != _index) setState(() => _index = index);
  }

  double _offsetFor(int index) => (index * _stride).clamp(
    _scroll.position.minScrollExtent,
    _scroll.position.maxScrollExtent,
  );

  void _moveTo(int index) {
    final offset = _offsetFor(index);
    if (widget.reducedMotion ||
        (MediaQuery.maybeOf(context)?.disableAnimations ?? false)) {
      _scroll.jumpTo(offset);
    } else {
      _scroll.animateTo(
        offset,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _browse(int delta) {
    if (!_scroll.hasClients || _count == 0) return;
    _moveTo((_index + delta).clamp(0, _count - 1));
  }

  bool _onScrollEnd(ScrollEndNotification notification) {
    if (notification.depth != 0 ||
        notification.metrics.axis != Axis.horizontal ||
        _aligning ||
        _snapScheduled) {
      return false;
    }
    _snapScheduled = true;
    final generation = _scopeGeneration;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _snapScheduled = false;
      if (!mounted ||
          generation != _scopeGeneration ||
          _aligning ||
          !_scroll.hasClients ||
          _scroll.position.isScrollingNotifier.value ||
          _count == 0) {
        return;
      }
      if ((_scroll.offset - _offsetFor(_index)).abs() > .1) _moveTo(_index);
    });
    WidgetsBinding.instance.ensureVisualUpdate();
    return false;
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final viewportWidth = constraints.hasBoundedWidth
          ? constraints.maxWidth
          : MediaQuery.sizeOf(context).width;
      final cardWidth = math.min(240.0, math.max(0.0, viewportWidth - _peek));
      final stride = cardWidth + _gap;
      if (_stride != stride) {
        _stride = stride;
        _alignAfterLayout();
      }
      return SizedBox(
        width: viewportWidth,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            NotificationListener<ScrollEndNotification>(
              onNotification: _onScrollEnd,
              child: SingleChildScrollView(
                key: ValueKey('${widget.keyPrefix}-scroll'),
                controller: _scroll,
                primary: false,
                scrollDirection: Axis.horizontal,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var index = 0; index < _count; index++) ...[
                      if (index > 0) const SizedBox(width: _gap),
                      SizedBox(
                        width: cardWidth,
                        child: widget.cardBuilder(context, index, cardWidth),
                      ),
                    ],
                    // Let the last choice reach the same leading position as the
                    // first. The counter and arrow steps then match swipe steps.
                    if (_count > 0)
                      SizedBox(width: math.max(0, viewportWidth - cardWidth)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _arrow(
                  key: ValueKey('${widget.keyPrefix}-previous'),
                  label: widget.previousLabel,
                  icon: Icons.chevron_left_rounded,
                  onPressed: _index > 0 ? () => _browse(-1) : null,
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        widget.positionLabel(
                          _count == 0 ? 0 : _index + 1,
                          _count,
                        ),
                        key: ValueKey('${widget.keyPrefix}-position'),
                        style: Theme.of(context).textTheme.labelLarge,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
                _arrow(
                  key: ValueKey('${widget.keyPrefix}-next'),
                  label: widget.nextLabel,
                  icon: Icons.chevron_right_rounded,
                  onPressed: _index + 1 < _count ? () => _browse(1) : null,
                ),
              ],
            ),
          ],
        ),
      );
    },
  );

  Widget _arrow({
    required Key key,
    required String label,
    required IconData icon,
    required VoidCallback? onPressed,
  }) => IconButton.outlined(
    key: key,
    tooltip: label,
    onPressed: onPressed,
    constraints: const BoxConstraints.tightFor(
      width: GeoMathSpacing.touchTarget,
      height: GeoMathSpacing.touchTarget,
    ),
    padding: EdgeInsets.zero,
    visualDensity: VisualDensity.standard,
    icon: Icon(icon),
  );
}
