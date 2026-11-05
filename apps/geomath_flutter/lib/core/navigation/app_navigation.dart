import 'dart:async';

import 'package:flutter/widgets.dart';

import '../features/feature_contribution.dart';

enum BackOrigin { system, gesture, appBar, programmatic }

enum BackDecision { allow, stay }

enum BackOutcome { popped, atRoot, blocked, superseded }

final class BackRequest {
  const BackRequest({required this.origin, required this.route});
  final BackOrigin origin;
  final AppRouteEntry route;
}

typedef BackPolicy = Future<BackDecision> Function(BackRequest request);

final class AppRouteEntry {
  const AppRouteEntry({
    required this.route,
    required this.instance,
    this.arguments = const {},
  });

  final FeatureRoute route;
  final int instance;
  final Map<String, Object?> arguments;
}

/// Root Router supplies entry arguments and visibility without owning a second
/// feature-specific Navigator. Covered module routes can pause while keeping
/// their camera, draft, controller and WebView instance alive.
final class AppRouteScope extends InheritedWidget {
  const AppRouteScope({
    super.key,
    required this.entry,
    required this.isCurrent,
    required super.child,
  });

  final AppRouteEntry entry;
  final bool isCurrent;

  static AppRouteScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppRouteScope>();

  static AppRouteScope of(BuildContext context) {
    final scope = maybeOf(context);
    assert(scope != null, 'Missing AppRouteScope');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppRouteScope oldWidget) =>
      entry != oldWidget.entry || isCurrent != oldWidget.isCurrent;
}

/// One navigation and back owner for root, Android and app-bar adapters.
///
/// The native Router consumes [entries] and builds the registered route widgets.
/// Every back entry point calls [requestBack], including gesture back. Activity
/// features implement pause/save/forfeit confirmation through [BackPolicy].
final class AppNavigationController extends ChangeNotifier {
  AppNavigationController({
    required this.routes,
    required String initialRoute,
  }) {
    _entries.add(_entry(initialRoute));
  }

  final FeatureRouteRegistry routes;
  final List<AppRouteEntry> _entries = [];
  int _nextInstance = 0;
  Future<BackOutcome>? _pendingBack;
  bool _disposed = false;

  List<AppRouteEntry> get entries => List.unmodifiable(_entries);
  AppRouteEntry get current => _entries.last;
  bool get canPop => _entries.length > 1;
  bool get hasPendingBack => _pendingBack != null;

  AppRouteEntry _entry(
    String routeName, [
    Map<String, Object?> arguments = const {},
  ]) => AppRouteEntry(
    route: routes[routeName],
    instance: _nextInstance++,
    arguments: Map.unmodifiable(arguments),
  );

  void push(String routeName, {Map<String, Object?> arguments = const {}}) {
    _ensureActive();
    _entries.add(_entry(routeName, arguments));
    notifyListeners();
  }

  void replace(String routeName, {Map<String, Object?> arguments = const {}}) {
    _ensureActive();
    final entry = _entry(routeName, arguments);
    _entries[_entries.length - 1] = entry;
    notifyListeners();
  }

  void reset(String routeName, {Map<String, Object?> arguments = const {}}) {
    _ensureActive();
    final entry = _entry(routeName, arguments);
    _entries
      ..clear()
      ..add(entry);
    notifyListeners();
  }

  /// Destination changes discard the whole stack, so covered activities must
  /// save or confirm too. A stale completion never clears a newer route.
  Future<BackOutcome> requestReset(String routeName) {
    _ensureActive();
    routes[routeName];
    if (_pendingBack case final pending?) return pending;
    final snapshot = List<AppRouteEntry>.of(_entries);
    final completer = Completer<BackOutcome>();
    _pendingBack = completer.future;
    bool unchanged() =>
        !_disposed &&
        _entries.length == snapshot.length &&
        List.generate(
          snapshot.length,
          (index) => _entries[index].instance == snapshot[index].instance,
        ).every((same) => same);
    Future<void>(() async {
      try {
        for (final route in snapshot.reversed) {
          final decision =
              await route.route.backPolicy?.call(
                BackRequest(origin: BackOrigin.programmatic, route: route),
              ) ??
              BackDecision.allow;
          if (!unchanged()) {
            completer.complete(BackOutcome.superseded);
            return;
          }
          if (decision == BackDecision.stay) {
            completer.complete(BackOutcome.blocked);
            return;
          }
        }
        reset(routeName);
        completer.complete(BackOutcome.popped);
      } catch (error, stack) {
        completer.completeError(error, stack);
      } finally {
        if (identical(_pendingBack, completer.future)) _pendingBack = null;
      }
    });
    return completer.future;
  }

  Future<BackOutcome> requestBack(BackOrigin origin) {
    _ensureActive();
    if (_pendingBack case final pending?) return pending;
    final route = current;
    // Publish the pending Future before a synchronous policy can reenter back.
    final completer = Completer<BackOutcome>();
    _pendingBack = completer.future;
    Future<void>(() async {
      try {
        final decision =
            await route.route.backPolicy?.call(
              BackRequest(origin: origin, route: route),
            ) ??
            BackDecision.allow;
        if (_disposed || current.instance != route.instance) {
          completer.complete(BackOutcome.superseded);
          return;
        }
        if (decision == BackDecision.stay) {
          completer.complete(BackOutcome.blocked);
          return;
        }
        if (!canPop) {
          completer.complete(BackOutcome.atRoot);
          return;
        }
        _entries.removeLast();
        notifyListeners();
        completer.complete(BackOutcome.popped);
      } catch (error, stack) {
        completer.completeError(error, stack);
      } finally {
        if (identical(_pendingBack, completer.future)) _pendingBack = null;
      }
    });
    return completer.future;
  }

  void _ensureActive() {
    if (_disposed) throw StateError('Navigation controller disposed');
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
