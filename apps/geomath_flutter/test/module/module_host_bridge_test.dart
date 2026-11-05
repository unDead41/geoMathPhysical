import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/module/module_host_bridge.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';

const _trusted = ModuleMessageContext(
  documentId: 'document-1',
  isTrustedDocument: true,
  sourceProof: ModuleSourceProof.wrapperCapability,
);

void main() {
  late SessionController sessions;
  late AppLifecycleController lifecycle;
  late ModuleHostBridge bridge;

  String envelope(String command, [Map<String, Object?> payload = const {}]) =>
      jsonEncode({
        ...bridge.identity.toJson(),
        'command': command,
        'payload': payload,
      });

  Map<String, Object?> progress({
    String stage = 'explanation',
    String prediction = 'Enam muka',
    String result = 'Enam muka sepadan',
    String explanation = 'Muka ialah permukaan rata.',
    bool completed = true,
  }) => {
    'type': 'geodecoder:module-progress',
    'protocol': 1,
    'session': 'canonical-progress-capability',
    'activity': 'net',
    'stage': stage,
    'prediction': prediction,
    'result': result,
    'explanation': explanation,
    'completed': completed,
  };

  FailureCode code(Result<ModuleCommand> result) =>
      (result as Failed<ModuleCommand>).failure.code;

  setUp(() {
    sessions = SessionController.guest(
      guestId: 'installation',
      sessionId: 's1',
    );
    lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    bridge = ModuleHostBridge(
      sessions: sessions,
      lifecycle: lifecycle,
      instanceId: 'native-module-instance',
      bridgeSession: 'unshared-wrapper-capability',
      progressSession: 'canonical-progress-capability',
      allowedNavigationRoutes: {'/help', '/settings'},
    );
    bridge.attachDocument('document-1');
  });

  tearDown(() async {
    bridge.dispose();
    lifecycle.dispose();
    await sessions.dispose();
  });

  test('ready handshake and progress retain authoritative native actor', () {
    final identity = bridge.identity.toJson();
    expect(identity.keys.toSet(), {
      'nativeBridgeVersion',
      'instanceId',
      'bridgeSession',
    });
    expect(bridge.status, ModuleBridgeStatus.awaitingReady);
    expect(
      code(bridge.receive(envelope('progress', progress()), context: _trusted)),
      FailureCode.unavailable,
    );
    expect(
      bridge.receive(envelope('ready'), context: _trusted),
      isA<Success<ModuleCommand>>(),
    );
    final accepted = bridge.receive(
      envelope('progress', progress()),
      context: _trusted,
    ) as Success<ModuleCommand>;
    expect(accepted.value.binding, sessions.current);
    expect(accepted.value.kind, ModuleCommandKind.progress);
    expect(accepted.value.progress!.activity, 'net');
    expect(accepted.value.progress!.completed, isTrue);
    expect(bridge.status, ModuleBridgeStatus.ready);
  });

  test(
    'native envelope version is distinct from progress and settings versions',
    () {
      bridge.receive(envelope('ready'), context: _trusted);
      final wrongSession = progress()
        ..['session'] = bridge.identity.bridgeSession;
      expect(
        code(
          bridge.receive(envelope('progress', wrongSession), context: _trusted),
        ),
        FailureCode.invalid,
      );
      final wrongProtocol = progress()..['protocol'] = 2;
      expect(
        code(
          bridge.receive(
            envelope('progress', wrongProtocol),
            context: _trusted,
          ),
        ),
        FailureCode.invalid,
      );
      expect(
        code(
          bridge.receive(
            envelope('progress', {
              'channel': 'settings',
              'version': 1,
              'instanceId': 'settings-only',
              'type': 'apply',
              'settings': <String, Object>{},
            }),
            context: _trusted,
          ),
        ),
        FailureCode.invalid,
      );
    },
  );

  test(
    'old epoch messages close the bridge after logout or actor/scope switch',
    () {
      bridge.receive(envelope('ready'), context: _trusted);
      final oldProgress = envelope('progress', progress());
      sessions.bindUser(userId: 'account-a', sessionId: 'validated-session-a');
      expect(bridge.status, ModuleBridgeStatus.closed);
      expect(
        code(bridge.receive(oldProgress, context: _trusted)),
        FailureCode.stale,
      );
      expect(() => bridge.attachDocument('new-document'), throwsStateError);
    },
  );

  test('logout invalidates a signed-in bridge even when the guest partition exists', () {
    bridge.dispose();
    sessions.bindUser(userId: 'account-a', sessionId: 'validated-session-a');
    bridge = ModuleHostBridge(
      sessions: sessions,
      lifecycle: lifecycle,
      instanceId: 'signed-in-instance',
      bridgeSession: 'signed-in-wrapper-capability',
      progressSession: 'canonical-progress-capability',
    )..attachDocument('document-1');
    bridge.receive(envelope('ready'), context: _trusted);
    final beforeLogout = envelope('progress', progress());
    sessions.logout();
    expect(
      code(bridge.receive(beforeLogout, context: _trusted)),
      FailureCode.stale,
    );
    expect(bridge.status, ModuleBridgeStatus.closed);
  });

  test(
    'same session token refresh preserves the bridge; changed scope closes it',
    () {
      sessions.bindUser(userId: 'account-a', sessionId: 'session-a');
      bridge.dispose();
      bridge = ModuleHostBridge(
        sessions: sessions,
        lifecycle: lifecycle,
        instanceId: 'i2',
        bridgeSession: 'native-2',
        progressSession: 'progress-2',
      )..attachDocument('document-1');
      sessions.bindUser(userId: 'account-a', sessionId: 'session-a');
      expect(bridge.status, ModuleBridgeStatus.awaitingReady);
      sessions.changeScope('other-activity');
      expect(bridge.status, ModuleBridgeStatus.closed);
    },
  );

  test(
    'background blocks input and foreground resumes the same ready instance',
    () {
      bridge.receive(envelope('ready'), context: _trusted);
      final identity = bridge.identity;
      lifecycle.setPhase(AppLifecyclePhase.background);
      expect(bridge.status, ModuleBridgeStatus.suspended);
      expect(
        code(bridge.receive(envelope('open-help'), context: _trusted)),
        FailureCode.unavailable,
      );
      lifecycle.setPhase(AppLifecyclePhase.foreground);
      expect(bridge.status, ModuleBridgeStatus.ready);
      expect(bridge.identity, same(identity));
      expect(
        bridge.receive(envelope('open-help'), context: _trusted),
        isA<Success>(),
      );
      lifecycle.setPhase(AppLifecyclePhase.detached);
      expect(bridge.status, ModuleBridgeStatus.closed);
    },
  );

  test(
    'forged identity, document generation, actor and credentials are rejected',
    () {
      final forged = {
        ...bridge.identity.toJson(),
        'bridgeSession': 'guessed',
        'command': 'ready',
        'payload': <String, Object?>{},
      };
      expect(
        code(bridge.receive(jsonEncode(forged), context: _trusted)),
        FailureCode.unauthorized,
      );
      expect(
        code(
          bridge.receive(
            envelope('ready'),
            context: const ModuleMessageContext(
              documentId: 'document-1',
              isTrustedDocument: false,
              sourceProof: ModuleSourceProof.wrapperCapability,
            ),
          ),
        ),
        FailureCode.unauthorized,
      );
      bridge.attachDocument('document-2');
      expect(
        code(bridge.receive(envelope('ready'), context: _trusted)),
        FailureCode.unauthorized,
      );
      bridge.attachDocument('document-1');
      for (final field in [
        'actor',
        'userId',
        'owner',
        'epoch',
        'access_token',
      ]) {
        final message = {
          ...bridge.identity.toJson(),
          'command': 'ready',
          'payload': <String, Object?>{},
          field: 'forged',
        };
        expect(
          code(bridge.receive(jsonEncode(message), context: _trusted)),
          FailureCode.invalid,
        );
        expect(
          code(
            bridge.receive(
              envelope('ready', {field: 'forged'}),
              context: _trusted,
            ),
          ),
          FailureCode.invalid,
        );
      }
    },
  );

  test('malformed/unknown/oversize messages cannot make an instance ready', () {
    for (final raw in ['null', '[]', 'true', '1', '"x"', '{', '{}']) {
      expect(code(bridge.receive(raw, context: _trusted)), FailureCode.invalid);
    }
    expect(
      code(bridge.receive(envelope('arbitrary-rpc'), context: _trusted)),
      FailureCode.invalid,
    );
    final multibyte = envelope('ready', {
      'padding': List.filled(22000, '界').join(),
    });
    expect(multibyte.length, lessThan(ModuleHostBridge.maxEnvelopeBytes));
    expect(
      utf8.encode(multibyte).length,
      greaterThan(ModuleHostBridge.maxEnvelopeBytes),
    );
    expect(
      code(bridge.receive(multibyte, context: _trusted)),
      FailureCode.invalid,
    );
    expect(bridge.status, ModuleBridgeStatus.awaitingReady);
  });

  test('progress validation enforces canonical stages, fields and inclusive limits', () {
    bridge.receive(envelope('ready'), context: _trusted);
    final maximum = progress(
      prediction: List.filled(240, 'p').join(),
      result: List.filled(600, 'r').join(),
      explanation: List.filled(600, 'e').join(),
    );
    expect(
      bridge.receive(envelope('progress', maximum), context: _trusted),
      isA<Success>(),
    );
    final invalid = [
      progress(prediction: List.filled(241, 'p').join()),
      progress(result: List.filled(601, 'r').join()),
      progress(explanation: List.filled(601, 'e').join()),
      progress(prediction: ''),
      progress(result: ''),
      progress(explanation: ''),
      progress(stage: 'prediction', completed: true),
      progress(prediction: 'text\u0001'),
      progress()..['activity'] = 'invented-activity',
      progress()..['stage'] = 'complete',
      progress()..['owner'] = 'attacker',
    ];
    for (final payload in invalid) {
      expect(
        code(bridge.receive(envelope('progress', payload), context: _trusted)),
        FailureCode.invalid,
      );
    }
    expect(
      bridge.receive(
        envelope(
          'progress',
          progress(
            stage: 'prediction',
            result: '',
            explanation: '',
            completed: false,
          ),
        ),
        context: _trusted,
      ),
      isA<Success>(),
    );
  });

  test(
    'navigation uses an explicit native allowlist and cannot invoke RPC',
    () {
      bridge.receive(envelope('ready'), context: _trusted);
      final accepted = bridge.receive(
        envelope('request-navigation', {'route': '/help'}),
        context: _trusted,
      ) as Success<ModuleCommand>;
      expect(accepted.value.navigationRoute, '/help');
      for (final payload in [
        {'route': '/account/security'},
        {'route': 'https://example.test/'},
        {'route': '/help', 'rpc': 'delete_all'},
      ]) {
        expect(
          code(
            bridge.receive(
              envelope('request-navigation', payload),
              context: _trusted,
            ),
          ),
          FailureCode.invalid,
        );
      }
    },
  );
}
