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
  }) : actor = sessions.current {
    host = ModuleSpikeController(
      sessions: sessions,
      lifecycle: lifecycle,
      preferences: preferences,
      audio: audio,
      onCommand: _onCommand,
    );
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
  AppFailure? failure;
  AppFailure? checkpointFailure;
  bool recoveryRequired = false;
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
    final privateReady = await _awaitPrivateReady();
    if (!privateReady || !isCurrent) {
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
    if (!launched.isSuccess) return;
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

  Future<bool> _awaitPrivateReady() async {
    final deadline = DateTime.now().add(const Duration(seconds: 8));
    while (isCurrent && DateTime.now().isBefore(deadline)) {
      try {
        final view = host.webViewController;
        if (view == null) return false;
        final value = _decode(
          await view.runJavaScriptReturningResult(
            'JSON.stringify(window.GeoMathModule.learningSnapshot())',
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
    await captureCheckpoint();
    if (!isCurrent) return _stale();
    mode = next;
    _lastCheckpoint = null;
    return action({'action': 'launch', 'section': section, 'mode': ?next});
  }

  Future<Result<void>> action(Map<String, Object?> payload) {
    final completion = Completer<Result<void>>();
    _operations = _operations
        .then((_) async {
          if (!isCurrent) {
            completion.complete(_stale());
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
    final view = host.webViewController;
    if (view == null || host.phase != ModuleLoadPhase.ready || !isCurrent) {
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
      final admissionDeadline = DateTime.now().add(const Duration(seconds: 8));
      do {
        if (!isCurrent) return _stale();
        accepted = _decode(
          await view.runJavaScriptReturningResult(
            'JSON.stringify(window.GeoMathModule.learningAction(${jsonEncode(payload)}))',
          ),
        );
        if (accepted?['error'] != 'learning-busy') break;
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
      final deadline = DateTime.now().add(const Duration(seconds: 8));
      while (DateTime.now().isBefore(deadline)) {
        await Future<void>.delayed(const Duration(milliseconds: 60));
        if (!isCurrent) return _stale();
        final response = _decode(
          await view.runJavaScriptReturningResult(
            'JSON.stringify(window.GeoMathModule.learningSnapshot())',
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
            _transferring = true;
            unawaited(Future<void>(() => _transferWorkflow(seed)));
          }
        }
        final exported = response?['export'];
        final external = response?['externalLink'];
        if (_visible &&
            lifecycle.isForeground &&
            (exported is Map || external is Map)) {
          await view.runJavaScript('window.GeoMathModule.clearNativeEvents()');
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
      return const Failed<void>(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'The offline learning action could not be completed.',
        ),
      );
    }
  }

  Future<Result<void>> captureCheckpoint() {
    final pending = _pendingCheckpoint;
    if (pending != null) return pending;
    if (recoveryRequired) return Future.value(Failed<void>(checkpointFailure!));
    if (_transferring) return Future.value(const Success<void>(null));
    if (!isCurrent || host.phase != ModuleLoadPhase.ready) {
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
    if (captured is Failed<void> || !isCurrent) return captured;
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

  Future<void> _transferWorkflow(Map<String, Object?> checkpoint) async {
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
    final target = checkpoint['section'];
    if (target is! String || !sections.contains(target) || target == section) {
      return;
    }
    try {
      final previous = _lastStableSnapshot;
      if (previous != null) {
        final restored = await action({
          'action': 'restore',
          'checkpoint': previous,
        });
        if (!restored.isSuccess) return;
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
    final view = host.webViewController;
    if (view == null) return;
    try {
      await view.runJavaScript('window.GeoMathModule.updateProgress($value)');
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
