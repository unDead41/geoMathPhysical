import 'package:flutter/widgets.dart';

enum AppLifecyclePhase { foreground, inactive, background, detached }

/// A single SDK lifecycle observer shared by modules, audio and game clocks.
final class AppLifecycleController extends ChangeNotifier
    with WidgetsBindingObserver {
  AppLifecycleController({bool observeWidgetsBinding = true})
    : _observing = observeWidgetsBinding {
    if (_observing) {
      final binding = WidgetsBinding.instance;
      binding.addObserver(this);
      if (binding.lifecycleState case final state?) {
        _phase = _map(state);
      }
    }
  }

  final bool _observing;
  AppLifecyclePhase _phase = AppLifecyclePhase.foreground;
  bool _disposed = false;

  AppLifecyclePhase get phase => _phase;
  bool get isForeground => _phase == AppLifecyclePhase.foreground;
  bool get isDisposed => _disposed;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) =>
      setPhase(_map(state));

  /// Platform adapter and deterministic lifecycle-test entry point.
  void setPhase(AppLifecyclePhase phase) {
    if (_disposed || phase == _phase) return;
    _phase = phase;
    notifyListeners();
  }

  static AppLifecyclePhase _map(AppLifecycleState state) => switch (state) {
    AppLifecycleState.resumed => AppLifecyclePhase.foreground,
    AppLifecycleState.inactive => AppLifecyclePhase.inactive,
    AppLifecycleState.hidden ||
    AppLifecycleState.paused => AppLifecyclePhase.background,
    AppLifecycleState.detached => AppLifecyclePhase.detached,
  };

  @override
  void dispose() {
    if (_disposed) return;
    if (_observing) WidgetsBinding.instance.removeObserver(this);
    _disposed = true;
    _phase = AppLifecyclePhase.detached;
    notifyListeners();
    super.dispose();
  }
}
