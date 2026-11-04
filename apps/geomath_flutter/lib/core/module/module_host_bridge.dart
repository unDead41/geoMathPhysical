import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../lifecycle/app_lifecycle.dart';
import '../result.dart';
import '../session/actor_binding.dart';
import '../session/auth_session.dart';

enum ModuleCommandKind {
  ready,
  progress,
  openSettings,
  openHelp,
  requestNavigation,
}

enum ModuleBridgeStatus {
  awaitingDocument,
  awaitingReady,
  ready,
  suspended,
  closed,
}

/// The Android JavaScriptChannel does not expose the sending frame.
///
/// The bundled wrapper adapter therefore uses an unshared capability in a
/// top-document closure, pins the native document generation, and validates the
/// child event.source before forwarding it. This is distinct from a platform
/// adapter that actually supplies native main-frame provenance.
enum ModuleSourceProof { wrapperCapability, nativeMainFrame }

/// Created by the native WebView adapter, never decoded from message JSON.
final class ModuleMessageContext {
  const ModuleMessageContext({
    required this.documentId,
    required this.isTrustedDocument,
    required this.sourceProof,
  });

  final String documentId;
  final bool isTrustedDocument;
  final ModuleSourceProof sourceProof;
}

/// Transport capability only. Actor identity and credentials are never exported.
final class ModuleBridgeIdentity {
  const ModuleBridgeIdentity({
    required this.instanceId,
    required this.bridgeSession,
  });

  final String instanceId;
  final String bridgeSession;

  Map<String, Object> toJson() => {
    'nativeBridgeVersion': 1,
    'instanceId': instanceId,
    'bridgeSession': bridgeSession,
  };
}

/// Progress protocol 1 is carried inside, not replaced by, native bridge v1.
final class ModuleProgressMessage {
  const ModuleProgressMessage({
    required this.session,
    required this.activity,
    required this.stage,
    required this.prediction,
    required this.result,
    required this.explanation,
    required this.completed,
  });

  final String session;
  final String activity;
  final String stage;
  final String prediction;
  final String result;
  final String explanation;
  final bool completed;
}

/// A validated command always uses the binding captured by the native owner.
final class ModuleCommand {
  const ModuleCommand({
    required this.kind,
    required this.binding,
    required this.instanceId,
    this.progress,
    this.navigationRoute,
  });

  final ModuleCommandKind kind;
  final ActorBinding binding;
  final String instanceId;
  final ModuleProgressMessage? progress;
  final String? navigationRoute;
}

abstract interface class ModuleBridgePort implements Listenable {
  ModuleBridgeIdentity get identity;
  ActorBinding get binding;
  ModuleBridgeStatus get status;
  void attachDocument(String documentId);
  Result<ModuleCommand> receive(
    String encodedEnvelope, {
    required ModuleMessageContext context,
  });
  void close();
}

/// Native actor/epoch, document, schema and lifecycle boundary for a module.
///
/// Create a new bridge and fresh capabilities for each module instance. The
/// wrapper retains [ModuleBridgeIdentity.bridgeSession] in its own closure;
/// only [progressSession] is shared with the sandboxed canonical child. Settings
/// channel version 1 has its own instanceId and is handled by the settings
/// adapter. No JS field can select the native actor, owner, scope or epoch.
final class ModuleHostBridge extends ChangeNotifier
    implements ModuleBridgePort {
  ModuleHostBridge({
    required this.sessions,
    required this.lifecycle,
    required String instanceId,
    required String bridgeSession,
    required this.progressSession,
    Set<String> allowedNavigationRoutes = const {},
  }) : identity = ModuleBridgeIdentity(
         instanceId: instanceId,
         bridgeSession: bridgeSession,
       ),
       binding = sessions.current,
       allowedNavigationRoutes = Set.unmodifiable(allowedNavigationRoutes) {
    for (final value in [instanceId, bridgeSession, progressSession]) {
      if (value.isEmpty || value.length > 256) {
        throw ArgumentError('Module capabilities must be nonempty and bounded');
      }
    }
    if (bridgeSession == progressSession) {
      throw ArgumentError('Native and progress capabilities must be distinct');
    }
    _sessionSubscription = sessions.bindings.listen((_) => _checkActor());
    lifecycle.addListener(_onLifecycle);
    if (lifecycle.isDisposed) close();
  }

  static const int maxEnvelopeBytes = 64 * 1024;
  final AuthSession sessions;
  final AppLifecycleController lifecycle;
  final String progressSession;
  final Set<String> allowedNavigationRoutes;
  @override
  final ModuleBridgeIdentity identity;
  @override
  final ActorBinding binding;
  late final StreamSubscription<ActorBinding> _sessionSubscription;
  String? _documentId;
  bool _ready = false;
  bool _closed = false;
  bool _disposed = false;

  @override
  ModuleBridgeStatus get status {
    if (_closed) return ModuleBridgeStatus.closed;
    if (!lifecycle.isForeground) return ModuleBridgeStatus.suspended;
    if (_documentId == null) return ModuleBridgeStatus.awaitingDocument;
    return _ready ? ModuleBridgeStatus.ready : ModuleBridgeStatus.awaitingReady;
  }

  @override
  void attachDocument(String documentId) {
    if (_closed) throw StateError('Module bridge closed');
    if (documentId.trim().isEmpty || documentId.length > 256) {
      throw ArgumentError('Invalid native document generation');
    }
    if (_documentId == documentId) return;
    _documentId = documentId;
    _ready = false;
    notifyListeners();
  }

  @override
  Result<ModuleCommand> receive(
    String encodedEnvelope, {
    required ModuleMessageContext context,
  }) {
    if (_closed || !sessions.isCurrent(binding)) {
      close();
      return _failure(FailureCode.stale, 'Module session has ended.');
    }
    if (!lifecycle.isForeground) {
      return _failure(FailureCode.unavailable, 'Module is paused.');
    }
    if (_documentId == null ||
        !context.isTrustedDocument ||
        context.documentId != _documentId) {
      return _failure(
        FailureCode.unauthorized,
        'Module source is not trusted.',
      );
    }
    if (utf8.encode(encodedEnvelope).length > maxEnvelopeBytes) {
      return _failure(FailureCode.invalid, 'Module message exceeds its limit.');
    }
    Object? decoded;
    try {
      decoded = jsonDecode(encodedEnvelope);
    } on FormatException {
      return _invalid();
    } on StackOverflowError {
      return _invalid();
    }
    if (decoded is! Map<String, dynamic> ||
        !_exactKeys(decoded, const {
          'nativeBridgeVersion',
          'instanceId',
          'bridgeSession',
          'command',
          'payload',
        })) {
      return _invalid();
    }
    if (decoded['nativeBridgeVersion'] is! int ||
        decoded['nativeBridgeVersion'] != 1 ||
        decoded['instanceId'] != identity.instanceId ||
        decoded['bridgeSession'] != identity.bridgeSession) {
      return _failure(
        FailureCode.unauthorized,
        'Module identity did not match.',
      );
    }
    final payload = decoded['payload'];
    if (payload is! Map<String, dynamic>) return _invalid();
    final kind = switch (decoded['command']) {
      'ready' => ModuleCommandKind.ready,
      'progress' => ModuleCommandKind.progress,
      'open-settings' => ModuleCommandKind.openSettings,
      'open-help' => ModuleCommandKind.openHelp,
      'request-navigation' => ModuleCommandKind.requestNavigation,
      _ => null,
    };
    if (kind == null) return _invalid();
    if (kind != ModuleCommandKind.ready && !_ready) {
      return _failure(FailureCode.unavailable, 'Module is not ready.');
    }
    ModuleProgressMessage? progress;
    String? navigation;
    switch (kind) {
      case ModuleCommandKind.ready:
      case ModuleCommandKind.openSettings:
      case ModuleCommandKind.openHelp:
        if (payload.isNotEmpty) return _invalid();
      case ModuleCommandKind.progress:
        progress = _decodeProgress(payload);
        if (progress == null) return _invalid();
      case ModuleCommandKind.requestNavigation:
        if (!_exactKeys(payload, const {'route'}) ||
            payload['route'] is! String ||
            !allowedNavigationRoutes.contains(payload['route'])) {
          return _invalid();
        }
        navigation = payload['route'] as String;
    }
    if (kind == ModuleCommandKind.ready && !_ready) {
      _ready = true;
      notifyListeners();
    }
    return Success(
      ModuleCommand(
        kind: kind,
        binding: binding,
        instanceId: identity.instanceId,
        progress: progress,
        navigationRoute: navigation,
      ),
    );
  }

  ModuleProgressMessage? _decodeProgress(Map<String, dynamic> payload) {
    if (!_exactKeys(payload, const {
          'type',
          'protocol',
          'session',
          'activity',
          'stage',
          'prediction',
          'result',
          'explanation',
          'completed',
        }) ||
        payload['type'] != 'geodecoder:module-progress' ||
        payload['protocol'] is! int ||
        payload['protocol'] != 1 ||
        payload['session'] != progressSession ||
        !const {
          'net',
          'volume',
          'area',
          'composite',
        }.contains(payload['activity']) ||
        !const {
          'prediction',
          'experiment',
          'check',
          'explanation',
        }.contains(payload['stage']) ||
        payload['completed'] is! bool) {
      return null;
    }
    final prediction = _text(payload['prediction'], 240);
    final result = _text(payload['result'], 600);
    final explanation = _text(payload['explanation'], 600);
    if (prediction == null || result == null || explanation == null) {
      return null;
    }
    final stage = payload['stage'] as String;
    if (prediction.isEmpty || (stage != 'prediction' && result.isEmpty)) {
      return null;
    }
    if (stage == 'explanation' && explanation.isEmpty) return null;
    final completed = payload['completed'] as bool;
    if (completed && (stage != 'explanation' || explanation.isEmpty)) {
      return null;
    }
    return ModuleProgressMessage(
      session: progressSession,
      activity: payload['activity'] as String,
      stage: stage,
      prediction: prediction,
      result: result,
      explanation: explanation,
      completed: completed,
    );
  }

  static final _controls = RegExp(r'[\x00-\x08\x0B\x0C\x0E-\x1F]');

  static String? _text(Object? value, int limit) {
    if (value is! String || value.length > limit || _controls.hasMatch(value)) {
      return null;
    }
    return value.trim();
  }

  static bool _exactKeys(Map<String, dynamic> map, Set<String> keys) =>
      map.length == keys.length && keys.every(map.containsKey);

  static Failed<ModuleCommand> _invalid() =>
      _failure(FailureCode.invalid, 'Module message is invalid.');

  static Failed<ModuleCommand> _failure(FailureCode code, String message) =>
      Failed(AppFailure(code: code, message: message));

  void _checkActor() {
    if (!sessions.isCurrent(binding)) close();
  }

  void _onLifecycle() {
    if (lifecycle.phase == AppLifecyclePhase.detached || lifecycle.isDisposed) {
      close();
    } else if (!_closed) {
      notifyListeners();
    }
  }

  @override
  void close() {
    if (_closed) return;
    _closed = true;
    _ready = false;
    _documentId = null;
    unawaited(_sessionSubscription.cancel());
    lifecycle.removeListener(_onLifecycle);
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    if (_disposed) return;
    close();
    _disposed = true;
    super.dispose();
  }
}
