import 'dart:async';

import 'package:flutter/foundation.dart';

import '../lifecycle/app_lifecycle.dart';

/// Native audio and the module adapter implement the same permission gate.
///
/// An endpoint may play only while this coordinator grants permission. Revoking
/// it must pause all of that endpoint's music, speech and effects before the
/// Future completes; it must not start itself again without a fresh grant.
abstract interface class AudioEndpoint {
  Future<void> setPlaybackAllowed(bool allowed);
  Future<void> dispose();
}

/// One audio owner, with serialized handover and nested pause semantics.
final class AudioCoordinator extends ChangeNotifier {
  AudioCoordinator({required this.lifecycle, this._enabled = true}) {
    lifecycle.addListener(_onLifecycle);
  }

  final AppLifecycleController lifecycle;
  final Map<String, AudioLease> _leases = {};
  Future<void> _tail = Future<void>.value();
  Future<void>? _closing;
  AudioLease? _selected;
  AudioLease? _playing;
  int _pauses = 0;
  bool _enabled;
  bool _disposed = false;
  bool _notifierDisposed = false;
  bool _failed = false;

  String? get owner => _playing?.owner;
  bool get hasFailure => _failed;
  bool get isPaused => _pauses > 0 || !lifecycle.isForeground || !_enabled;

  AudioLease register({
    required String owner,
    required AudioEndpoint endpoint,
  }) {
    if (_disposed) throw StateError('Audio coordinator disposed');
    if (owner.trim().isEmpty || _leases.containsKey(owner)) {
      throw ArgumentError('Audio owner must be unique and nonempty');
    }
    final lease = AudioLease._(this, owner, endpoint);
    _leases[owner] = lease;
    return lease;
  }

  Future<void> setEnabled(bool enabled) => _enqueue(() async {
    _enabled = enabled;
    await _reconcile();
  });

  /// Dialogs and solo pause flows may nest; only the last release can resume.
  AudioPause pause() {
    if (_disposed) throw StateError('Audio coordinator disposed');
    _pauses++;
    _schedule(_reconcile);
    return AudioPause._(this);
  }

  Future<void> _activate(AudioLease lease) => _enqueue(() async {
    if (lease._released) throw StateError('Audio lease released');
    final previous = _selected;
    _selected = lease;
    try {
      await _reconcile();
    } catch (_) {
      _selected = previous;
      rethrow;
    }
  });

  Future<void> _release(AudioLease lease) => _enqueue(() async {
    if (identical(_selected, lease)) _selected = null;
    try {
      if (identical(_playing, lease)) {
        await lease._endpoint.setPlaybackAllowed(false);
        _playing = null;
      }
    } finally {
      _leases.remove(lease.owner);
      await lease._endpoint.dispose();
      if (!_disposed) notifyListeners();
    }
  });

  Future<void> _deactivate(AudioLease lease) => _enqueue(() async {
    if (lease._released) return;
    if (identical(_selected, lease)) _selected = null;
    await _reconcile();
  });

  Future<void> _releasePause() => _enqueue(() async {
    if (_pauses > 0) _pauses--;
    await _reconcile();
  });

  Future<void> _reconcile() async {
    final wanted = isPaused || _selected?._released == true ? null : _selected;
    if (identical(wanted, _playing)) return;
    // A failed revoke prevents granting another endpoint permission.
    if (_playing case final previous?) {
      await previous._endpoint.setPlaybackAllowed(false);
      _playing = null;
    }
    if (wanted != null && !wanted._released) {
      // A plugin may fail after changing its playback state. Keep track of the
      // possible owner until a successful revoke, so a later handover stays safe.
      _playing = wanted;
      try {
        await wanted._endpoint.setPlaybackAllowed(true);
      } catch (_) {
        try {
          await wanted._endpoint.setPlaybackAllowed(false);
          _playing = null;
        } catch (_) {
          // Retain the possible owner for a later revoke attempt.
        }
        rethrow;
      }
    }
    _failed = false;
    if (!_disposed) notifyListeners();
  }

  Future<void> _enqueue(Future<void> Function() action) {
    if (_disposed) {
      return Future.error(StateError('Audio coordinator disposed'));
    }
    final result = _tail.then((_) => action());
    _tail = result.then<void>(
      (_) {},
      onError: (Object _, StackTrace _) {
        _failed = true;
        if (!_disposed) notifyListeners();
      },
    );
    return result;
  }

  void _schedule(Future<void> Function() action) {
    unawaited(_enqueue(action).catchError((Object _) {}));
  }

  void _onLifecycle() => _schedule(_reconcile);

  /// Await this before disposing the lifecycle owner or native audio resources.
  Future<void> close() => _closing ??= _closeResources();

  Future<void> _closeResources() async {
    lifecycle.removeListener(_onLifecycle);
    // Block new registrations/operations while existing serialized work drains.
    _disposed = true;
    await _tail;
    Object? firstError;
    StackTrace? firstStack;
    for (final lease in _leases.values.toList().reversed) {
      lease._released = true;
      try {
        await lease._endpoint.setPlaybackAllowed(false);
      } catch (error, stack) {
        firstError ??= error;
        firstStack ??= stack;
      }
      try {
        await lease._endpoint.dispose();
      } catch (error, stack) {
        firstError ??= error;
        firstStack ??= stack;
      }
    }
    _leases.clear();
    _selected = null;
    _playing = null;
    if (!_notifierDisposed) dispose();
    if (firstError != null) Error.throwWithStackTrace(firstError, firstStack!);
  }

  @override
  void dispose() {
    unawaited(close().catchError((Object _) {}));
    if (!_notifierDisposed) {
      _notifierDisposed = true;
      super.dispose();
    }
  }
}

final class AudioLease {
  AudioLease._(this._coordinator, this.owner, this._endpoint);
  final AudioCoordinator _coordinator;
  final String owner;
  final AudioEndpoint _endpoint;
  bool _released = false;
  Future<void>? _releaseFuture;

  Future<void> activate() => _coordinator._activate(this);

  /// Release focus while retaining the endpoint for this route's next visit.
  Future<void> deactivate() => _coordinator._deactivate(this);

  Future<void> release() {
    if (_releaseFuture case final pending?) return pending;
    if (_coordinator._disposed) return _coordinator.close();
    _released = true;
    return _releaseFuture = _coordinator._release(this);
  }
}

final class AudioPause {
  AudioPause._(this._coordinator);
  final AudioCoordinator _coordinator;
  bool _released = false;

  Future<void> release() {
    if (_released) return Future<void>.value();
    _released = true;
    return _coordinator._releasePause();
  }
}
