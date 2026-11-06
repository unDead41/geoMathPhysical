import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../../core/audio/audio_coordinator.dart';
import '../../../core/lifecycle/app_lifecycle.dart';
import '../../../core/module/module_host_bridge.dart';
import '../../../core/records/formative_record.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../../core/preferences/preferences.dart';
import '../module_spike_host.dart';
import '../persistence/learning_checkpoint_repository.dart';
import '../persistence/learning_reflection_controller.dart';

/// The narrow native-JavaScript seam. Production delegates to the existing
/// verified WebView host; injected ports test missing platform replies only.
abstract interface class LearningJavaScriptPort {
  bool get isReady;
  Future<Object> evaluate(String script);
  Future<void> run(String script);
}

final class _WebViewLearningJavaScript implements LearningJavaScriptPort {
  _WebViewLearningJavaScript(this.host);
  final ModuleSpikeController host;

  @override
  bool get isReady =>
      host.phase == ModuleLoadPhase.ready && host.webViewController != null;

  @override
  Future<Object> evaluate(String script) =>
      host.webViewController!.runJavaScriptReturningResult(script);

  @override
  Future<void> run(String script) =>
      host.webViewController!.runJavaScript(script);
}

/// Feature actions use the verified wrapper's bounded private API. Identity,
/// lifecycle, audio and the canonical progress envelope stay foundation-owned.
final class LearningModuleController extends ChangeNotifier {
  LearningModuleController({
    required this.sessions,
    required this.lifecycle,
    required PreferencesRepository preferences,
    required AudioCoordinator audio,
    required this.checkpoints,
    required this.reflections,
    required this.section,
    required this.initialShape,
    this.mode,
    this.onNavigate,
    this.onExport,
    this.onExternalLink,
    this.onWorkflow,
    this.initialCheckpoint,
    LearningJavaScriptPort? javascript,
  }) : actor = sessions.current {
    host = ModuleSpikeController(
      sessions: sessions,
      lifecycle: lifecycle,
      preferences: preferences,
      audio: audio,
      onCommand: _onCommand,
    );
    _javascript = javascript ?? _WebViewLearningJavaScript(host);
    host.addListener(_hostChanged);
    lifecycle.addListener(_lifecycleChanged);
    reflections.addListener(_recordsChanged);
  }

  final AuthSession sessions;
  final AppLifecycleController lifecycle;
  final LearningCheckpointRepository checkpoints;
  final LearningReflectionController reflections;
  final ActorBinding actor;
  final String section;
  final String initialShape;
  String? mode;
  final void Function(String route)? onNavigate;
  final void Function(String svg)? onExport;
  final void Function(String url)? onExternalLink;
  final void Function(String section, Map<String, Object?> checkpoint)?
  onWorkflow;
  final Map<String, Object?>? initialCheckpoint;
  late final ModuleSpikeController host;
  late final LearningJavaScriptPort _javascript;
  static const _javaScriptBudget = Duration(seconds: 8);
  AppFailure? failure;
  AppFailure? checkpointFailure;
  bool recoveryRequired = false;
  bool initializationFailed = false;
  Map<String, Object?>? snapshot;
  bool _disposed = false;
  bool _visible = true;
  bool _initializing = true;
  Future<Result<void>>? _pendingCheckpoint;
  Timer? _checkpointTimer;
  String? _lastCheckpoint;
  String? _lastProgress;
  bool _transferring = false;
  Map<String, Object?>? _lastStableSnapshot;
  Future<void> _operations = Future<void>.value();

  String get slot => '$section:$initialShape:${mode ?? 'default'}';
  bool get isCurrent => !_disposed && sessions.isCurrent(actor);
  bool get isReady =>
      isCurrent &&
      !_initializing &&
      !_transferring &&
      !recoveryRequired &&
      host.phase == ModuleLoadPhase.ready;
  String get shape {
    if (currentSection == 'calculation') {
      final calculation = snapshot?['calculation'];
      final draft = calculation is Map ? calculation['draft'] : null;
      if (draft is Map && draft['shape'] is String) {
        return draft['shape'] as String;
      }
    }
    return (snapshot?['explore'] as Map?)?['shape'] as String? ?? initialShape;
  }

  String get currentSection => snapshot?['section'] as String? ?? section;

  Future<void> initialize() async {
    await host.initialize();
    final result = await host.ready;
    if (!isCurrent || result is Failed<ModuleCommand>) return;
    if (!await _waitUntilActive()) return;
    final privateReady = await _awaitPrivateReady();
    if (!privateReady || !isCurrent) {
      initializationFailed = true;
      failure = const AppFailure(
        code: FailureCode.unavailable,
        message: 'The learning controls could not finish loading. Reopen the module.',
      );
      if (isCurrent) notifyListeners();
      return;
    }
    final launched = await action({
      'action': 'launch',
      'section': section,
      'shape': initialShape,
      if (mode != null) 'mode': mode,
    });
    if (!launched.isSuccess) {
      initializationFailed = true;
      if (isCurrent) notifyListeners();
      return;
    }
    if (!isCurrent) return;
    await _syncReflections();
    final stored = initialCheckpoint != null
        ? Success<Map<String, Object?>?>(initialCheckpoint)
        : await checkpoints.read(actor, slot);
    if (!isCurrent) return;
    if (stored case Success<Map<String, Object?>?>(:final value)) {
      if (value != null) {
        final restored = await action({
          'action': 'restore',
          'checkpoint': value,
        });
        if (!restored.isSuccess) {
          checkpointFailure = restored.failureOrNull;
          recoveryRequired = true;
        }
      }
    } else {
      checkpointFailure = stored.failureOrNull;
      recoveryRequired = true;
    }
    if (!isCurrent) return;
    _initializing = false;
    _checkpointTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (_visible && lifecycle.isForeground) unawaited(captureCheckpoint());
    });
    notifyListeners();
    unawaited(captureCheckpoint());
  }

  void updateBrightness(Brightness brightness) =>
      host.updateBrightness(brightness);

  bool get _active => _visible && lifecycle.isForeground;

  Future<bool> _waitUntilActive() async {
    while (isCurrent && !_active) {
      await Future<void>.delayed(const Duration(milliseconds: 60));
    }
    return isCurrent;
  }

  Future<bool> _awaitPrivateReady() async {
    var deadline = DateTime.now().add(_javaScriptBudget);
    while (isCurrent) {
      if (!_active) {
        if (!await _waitUntilActive()) return false;
        deadline = DateTime.now().add(_javaScriptBudget);
      }
      if (!DateTime.now().isBefore(deadline)) break;
      try {
        if (!_javascript.isReady) return false;
        final value = _decode(
          await _evaluate(
            'JSON.stringify(window.GeoMathModule.learningSnapshot())',
            deadline: deadline,
          ),
        );
        if (value?['ready'] == true) return true;
      } catch (_) {
        /* wait for the private child bootstrap */
      }
      await Future<void>.delayed(const Duration(milliseconds: 60));
    }
    return false;
  }

  void setVisible(bool visible) {
    if (_visible == visible) return;
    if (!visible && isReady) unawaited(captureCheckpoint());
    _visible = visible;
    host.setRouteVisible(visible);
  }

  Future<Result<void>> launchMode(String? next) async {
    if (mode == next) return const Success<void>(null);
    final captured = await captureCheckpoint();
    if (!isCurrent) return _stale();
    if (!captured.isSuccess) return captured;
    mode = next;
    _lastCheckpoint = null;
    return action({'action': 'launch', 'section': section, 'mode': ?next});
  }

  Future<Result<void>> action(
    Map<String, Object?> payload, {
    String? expectedShape,
  }) {
    final completion = Completer<Result<void>>();
    _operations = _operations
        .then((_) async {
          if (!isCurrent) {
            completion.complete(_stale());
            return;
          }
          // Pointer movement can wait behind a deliberate shape launch. Drop
          // that old-model input when it reaches the queue head; it must not
          // rotate or unfold the newly selected model or replace its failure.
          if (expectedShape != null && shape != expectedShape) {
            completion.complete(
              const Failed<void>(
                AppFailure(
                  code: FailureCode.stale,
                  message: 'The selected shape has changed.',
                ),
              ),
            );
            return;
          }
          final result = await _dispatch(payload);
          if (isCurrent) {
            failure = result.failureOrNull;
            notifyListeners();
          }
          completion.complete(result);
        })
        .catchError((Object _) {
          if (!completion.isCompleted) {
            completion.complete(
              const Failed<void>(
                AppFailure(
                  code: FailureCode.unavailable,
                  message: 'The learning action could not finish. Try again.',
                ),
              ),
            );
          }
        });
    return completion.future;
  }

  Future<Result<void>> _dispatch(Map<String, Object?> payload) async {
    if (recoveryRequired &&
        (payload['action'] == 'workflow' ||
            payload['action'] == 'launch' && payload['section'] != section)) {
      return Failed<void>(checkpointFailure!);
    }
    if (!_javascript.isReady || !isCurrent) {
      return const Failed<void>(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'The offline module is not ready.',
        ),
      );
    }
    if (!_initializing &&
        !_transferring &&
        (payload['action'] == 'workflow' ||
            payload['action'] == 'launch' && payload['section'] != section)) {
      final captured = await _dispatch({'action': 'checkpoint'});
      if (!captured.isSuccess || !isCurrent) return captured;
      final previous = _lastStableSnapshot;
      if (previous != null) {
        final saved = await checkpoints.save(actor, slot, previous);
        if (!isCurrent) return _stale();
        if (!saved.isSuccess) {
          checkpointFailure = saved.failureOrNull;
          return saved;
        }
        _lastCheckpoint = jsonEncode(previous);
      }
    }
    try {
      Map<String, Object?>? accepted;
      var admissionDeadline = DateTime.now().add(_javaScriptBudget);
      do {
        if (!isCurrent) return _stale();
        if (_initializing && !_active) {
          if (!await _waitUntilActive()) return _stale();
          admissionDeadline = DateTime.now().add(_javaScriptBudget);
        }
        accepted = _decode(
          await _evaluate(
            'JSON.stringify(window.GeoMathModule.learningAction(${jsonEncode(payload)}))',
            deadline: admissionDeadline,
          ),
        );
        if (accepted?['error'] != 'learning-busy' &&
            !(_initializing && accepted?['error'] == 'learning-not-ready')) {
          break;
        }
        await Future<void>.delayed(const Duration(milliseconds: 60));
      } while (DateTime.now().isBefore(admissionDeadline));
      if (!isCurrent) return _stale();
      if (accepted?['accepted'] != true || accepted?['sequence'] is! int) {
        return const Failed<void>(
          AppFailure(
            code: FailureCode.invalid,
            message: 'This action is not available for the selected model.',
          ),
        );
      }
      final sequence = accepted!['sequence'] as int;
      final deadline = DateTime.now().add(_javaScriptBudget);
      while (DateTime.now().isBefore(deadline)) {
        await Future<void>.delayed(const Duration(milliseconds: 60));
        if (!isCurrent) return _stale();
        final response = _decode(
          await _evaluate(
            'JSON.stringify(window.GeoMathModule.learningSnapshot())',
            deadline: deadline,
          ),
        );
        if (!isCurrent) return _stale();
        if (response?['sequence'] != sequence || response?['pending'] == true) {
          continue;
        }
        final result = response?['result'];
        if (result is! Map || result['ok'] != true) {
          return const Failed<void>(
            AppFailure(
              code: FailureCode.invalid,
              message: 'The selected action was not accepted.',
            ),
          );
        }
        final value = response?['checkpoint'];
        if (value is Map) {
          snapshot = Map<String, Object?>.from(value);
          if (snapshot?['section'] == section) {
            _lastStableSnapshot = snapshot;
          } else if (!_initializing &&
              !_transferring &&
              _visible &&
              lifecycle.isForeground) {
            final seed = snapshot!;
            final rawOrigin = response?['transitionCheckpoint'];
            final origin = rawOrigin is Map
                ? Map<String, Object?>.from(rawOrigin)
                : null;
            _transferring = true;
            unawaited(
              Future<void>(() => _transferWorkflow(seed, origin: origin)),
            );
          }
        }
        final exported = response?['export'];
        final external = response?['externalLink'];
        if (_visible &&
            lifecycle.isForeground &&
            (exported is Map || external is Map)) {
          await _javascript
              .run('window.GeoMathModule.clearNativeEvents()')
              .timeout(_javaScriptBudget);
          if (!isCurrent) return _stale();
          final svg = exported is Map ? exported['svg'] : null;
          if (svg is String &&
              utf8.encode(svg).length <= 262144 &&
              svg.contains('<svg') &&
              !RegExp(
                r'<script|<foreignObject|\son[a-z]+\s*=|(?:href|src)\s*=\s*["\x27]https?:',
                caseSensitive: false,
              ).hasMatch(svg)) {
            onExport?.call(svg);
          }
          final url = external is Map ? external['url'] : null;
          if (url is String && url.length <= 2048) {
            final uri = Uri.tryParse(url);
            if (uri?.scheme == 'https' &&
                uri!.host.isNotEmpty &&
                uri.userInfo.isEmpty) {
              onExternalLink?.call(url);
            }
          }
        }
        return const Success<void>(null);
      }
      return const Failed<void>(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'The learning module did not respond. Reopen it to recover your checkpoint.',
        ),
      );
    } catch (_) {
      if (!isCurrent) return _stale();
      return const Failed<void>(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'The offline learning action could not be completed.',
        ),
      );
    }
  }

  Future<Object> _evaluate(String script, {required DateTime deadline}) {
    final remaining = deadline.difference(DateTime.now());
    if (remaining <= Duration.zero) {
      return Future<Object>.error(
        TimeoutException('Learning native call expired.'),
      );
    }
    // Timing out a platform Future does not cancel Android evaluation. Only
    // this bounded result is consumed; a late value cannot update the snapshot
    // or claim that a checkpoint was saved. A subsequent queued action can retry.
    return _javascript.evaluate(script).timeout(remaining);
  }

  Future<Result<void>> captureCheckpoint() {
    final pending = _pendingCheckpoint;
    if (pending != null) return pending;
    if (recoveryRequired) return Future.value(Failed<void>(checkpointFailure!));
    if (_transferring) return Future.value(const Success<void>(null));
    if (!isCurrent || !_javascript.isReady) {
      return Future.value(const Success<void>(null));
    }
    final operation = _captureCheckpoint();
    _pendingCheckpoint = operation;
    return operation.whenComplete(() {
      if (identical(_pendingCheckpoint, operation)) _pendingCheckpoint = null;
    });
  }

  Future<Result<void>> _captureCheckpoint() async {
    final captured = await action({'action': 'checkpoint'});
    if (!isCurrent) return _stale();
    if (captured is Failed<void>) return captured;
    final value = snapshot;
    if (value == null || value['section'] != section) {
      return const Success<void>(null);
    }
    final encoded = jsonEncode(value);
    if (_lastCheckpoint == encoded) return const Success<void>(null);
    final saved = await checkpoints.save(actor, slot, value);
    if (!isCurrent) return _stale();
    checkpointFailure = saved.failureOrNull;
    if (saved.isSuccess) _lastCheckpoint = encoded;
    notifyListeners();
    return saved;
  }

  Future<void> _transferWorkflow(
    Map<String, Object?> checkpoint, {
    Map<String, Object?>? origin,
  }) async {
    if (!isCurrent) return;
    const sections = {
      'explore',
      'views',
      'notes',
      'calculator',
      'net',
      'volume',
      'area',
      'composite',
      'projection',
      'calculation',
    };
    try {
      final target = checkpoint['section'];
      if (target is! String ||
          !sections.contains(target) ||
          target == section) {
        return;
      }
      // A canonical DOM button can change sections between native polls. Its
      // synchronously captured origin includes typing since the last poll.
      final previous = origin?['section'] == section
          ? origin
          : _lastStableSnapshot;
      if (previous != null) {
        final encoded = jsonEncode(previous);
        final saved = _lastCheckpoint == encoded
            ? const Success<void>(null)
            : await checkpoints.save(actor, slot, previous);
        if (!isCurrent) return;
        final restored = await action({
          'action': 'restore',
          'checkpoint': previous,
        });
        if (!isCurrent) return;
        if (!restored.isSuccess) {
          checkpointFailure = restored.failureOrNull;
          recoveryRequired = true;
          return;
        }
        if (!saved.isSuccess) {
          // The freshest origin is already restored in the live document.
          // Retry saving that draft rather than loading an older stored copy.
          checkpointFailure = saved.failureOrNull;
          recoveryRequired = false;
          return;
        }
        _lastCheckpoint = encoded;
      }
      if (isCurrent && _visible && lifecycle.isForeground) {
        onWorkflow?.call(target, checkpoint);
      }
    } finally {
      _transferring = false;
      if (isCurrent) notifyListeners();
    }
  }

  Future<Result<void>> recoverCheckpoint({bool startNew = false}) async {
    if (!isCurrent) return _stale();
    if (startNew) {
      recoveryRequired = false;
      checkpointFailure = null;
      return captureCheckpoint();
    }
    final stored = await checkpoints.read(actor, slot);
    if (!isCurrent) return _stale();
    if (stored case Failed<Map<String, Object?>?>(:final failure)) {
      checkpointFailure = failure;
      notifyListeners();
      return Failed<void>(failure);
    }
    final value = stored.valueOrNull;
    final restored = value == null
        ? const Success<void>(null)
        : await action({'action': 'restore', 'checkpoint': value});
    if (!isCurrent) return _stale();
    recoveryRequired = !restored.isSuccess;
    checkpointFailure = restored.failureOrNull;
    notifyListeners();
    return restored;
  }

  void _recordsChanged() {
    if (isCurrent && host.phase == ModuleLoadPhase.ready) {
      unawaited(_syncReflections());
    }
  }

  Future<void> _syncReflections() async {
    if (!isCurrent ||
        reflections.actor != actor ||
        reflections.loading ||
        reflections.readFailure != null) {
      return;
    }
    final value = jsonEncode(
      reflections.records.map((r) => r.toJson()).toList(),
    );
    if (value == _lastProgress) return;
    _lastProgress = value;
    if (!_javascript.isReady) {
      _lastProgress = null;
      return;
    }
    try {
      await _javascript
          .run('window.GeoMathModule.updateProgress($value)')
          .timeout(_javaScriptBudget);
    } catch (_) {
      if (isCurrent) _lastProgress = null;
    }
  }

  Future<void> _onCommand(ModuleCommand command) async {
    if (!isCurrent || command.binding != actor) return;
    switch (command.kind) {
      case ModuleCommandKind.progress:
        final p = command.progress!;
        final dto = ModuleReflection.fromJson({
          'activity': p.activity,
          'stage': p.stage,
          'prediction': p.prediction,
          'result': p.result,
          'explanation': p.explanation,
          'completed': p.completed,
        });
        if (dto case Success<ModuleReflection>(:final value)) {
          await reflections.save(value, actor: command.binding);
        }
      case ModuleCommandKind.openSettings:
        onNavigate?.call('preferences');
      case ModuleCommandKind.openHelp:
        onNavigate?.call('help');
      case ModuleCommandKind.requestNavigation:
        onNavigate?.call(
          command.navigationRoute == '/settings' ? 'preferences' : 'help',
        );
      case ModuleCommandKind.ready:
        break;
    }
  }

  void _lifecycleChanged() {
    if (lifecycle.isForeground && isReady) unawaited(captureCheckpoint());
  }

  void _hostChanged() {
    if (_disposed) return;
    if (!sessions.isCurrent(actor) || host.phase == ModuleLoadPhase.closed) {
      snapshot = null;
      _checkpointTimer?.cancel();
    }
    notifyListeners();
  }

  static Map<String, Object?>? _decode(Object raw) {
    Object? value = raw;
    for (var attempt = 0; attempt < 3 && value is String; attempt++) {
      value = jsonDecode(value);
    }
    return value is Map ? Map<String, Object?>.from(value) : null;
  }

  static Result<void> _stale() => const Failed<void>(
    AppFailure(
      code: FailureCode.stale,
      message: 'This learning session has ended.',
    ),
  );

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _checkpointTimer?.cancel();
    lifecycle.removeListener(_lifecycleChanged);
    reflections.removeListener(_recordsChanged);
    host.removeListener(_hostChanged);
    host.dispose();
    super.dispose();
  }
}
