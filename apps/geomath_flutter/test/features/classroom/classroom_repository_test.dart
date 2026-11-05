import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/core/features/service_registry.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/session/session_store.dart';
import 'package:geomath_flutter/features/auth/auth_feature.dart';
import 'package:geomath_flutter/features/auth/auth_services.dart';
import 'package:geomath_flutter/features/auth/data/auth_transport.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_repository.dart';
import 'package:geomath_flutter/features/classroom/classroom_feature.dart';

import 'classroom_fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SessionController sessions;
  late NativeAuthRepository auth;
  late _ScriptedTransport transport;
  late ServiceRegistry services;
  late ClassroomController controller;

  setUp(() {
    sessions = SessionController.guest(
      guestId: 'classroom-gateway',
      sessionId: 'guest',
    );
    transport = _ScriptedTransport();
    auth = NativeAuthRepository(
      sessions: sessions,
      store: _MemoryProtectedStore(),
      configuration: const PublicBackendConfiguration(
        url: 'https://example.supabase.co',
        publishableKey: 'sb_publishable_abcdefghijklmnopqrstuvwxyz',
      ),
      transport: transport,
    );
    services = ServiceRegistry([
      ...authFeature(repository: auth).services,
      ...classroomFeature().services,
    ]);
    controller = ClassroomController(
      repository: services.get(ClassroomServices.repository),
      sessions: sessions,
    );
  });
  tearDown(() async {
    controller.dispose();
    services.dispose();
    auth.dispose();
    await sessions.dispose();
  });

  Future<void> login() async {
    expect(
      (await auth.login(
        identifier: 'teacher_a',
        password: 'fixture-password',
      )).isSuccess,
      isTrue,
    );
  }

  test('registered classroom borrows the sole verified native Auth gateway', () async {
    expect(services.get(AuthServices.gateway), same(auth));
    expect(controller.repository.gateway, same(auth));
    expect(controller.repository.sessions, same(sessions));
    expect(await controller.refresh(), isFalse);
    expect(transport.requests, isEmpty);
    // A foundation binding is identity and cannot invent an authenticated RPC.
    sessions.bindUser(userId: teacherA, sessionId: 'unverified');
    expect(await controller.refresh(), isFalse);
    expect(controller.failure?.code, FailureCode.unauthorized);
    expect(transport.requests, isEmpty);

    await login();
    expect(await controller.refresh(explicit: true), isTrue);
    expect(controller.snapshot!.profile.id, teacherA);
    final snapshotRequest = transport.requests.last;
    expect(snapshotRequest.uri.path, '/rest/v1/rpc/geo_action');
    expect(snapshotRequest.body, {'action': 'snapshot', 'payload': {}});
    expect(snapshotRequest.headers['Authorization'], startsWith('Bearer '));
    expect(
      snapshotRequest.headers['Authorization'],
      isNot('Bearer sb_publishable_abcdefghijklmnopqrstuvwxyz'),
    );
    controller.editInvite(
      controller.snapshot!.classes.first.invites.single,
      cancel: true,
    );
    expect(await controller.saveManagement(), isTrue);
    expect(transport.requests.last.body, {
      'action': 'cancel_invite',
      'payload': {'invite_id': inviteA},
    });
  });

  test(
    'native gateway 503 retains the draft and requires server reconciliation',
    () async {
      await login();
      expect(await controller.refresh(), isTrue);
      controller.editClass(controller.snapshot!.classes.first, 'rename_class');
      final draft = controller.management!;
      draft.name = 'Still my draft';
      transport.rpc = (_) => const AuthResponse(503, {
        'error': {'code': 'request_failed'},
      });
      expect(await controller.saveManagement(), isFalse);
      expect(controller.failure?.code, FailureCode.network);
      expect(controller.requiresReconciliation, isTrue);
      expect(controller.management, same(draft));
      expect(draft.name, 'Still my draft');
      final before = transport.requests.length;
      expect(await controller.saveManagement(), isFalse);
      expect(transport.requests.length, before);
      transport.rpc = (_) => AuthResponse(
        200,
        snapshotFixture(revision: 4, name: 'Accepted server name'),
      );
      expect(await controller.refreshManagement(), isTrue);
      expect(draft.name, 'Still my draft');
      expect(draft.serverName, 'Accepted server name');
      expect(draft.revision, 4);
      expect(controller.requiresReconciliation, isFalse);
      expect(
        transport.requests.where((r) => r.body?['action'] == 'rename_class'),
        hasLength(1),
      );
    },
  );

  test('late response through the native gateway cannot repopulate another session', () async {
    await login();
    expect(await controller.refresh(), isTrue);
    final response = Completer<AuthResponse>(), started = Completer<void>();
    transport.rpc = (_) {
      started.complete();
      return response.future;
    };
    final read = controller.refresh();
    await started.future;
    sessions.logout();
    sessions.bindUser(userId: studentB, sessionId: 'replacement-session');
    response.complete(AuthResponse(200, snapshotFixture()));
    expect(await read, isFalse);
    expect(controller.snapshot, isNull);
    expect(controller.attempt, isNull);
    expect(controller.sessions.current.userId, studentB);
  });
}

/// Test-only wire transport. No hosted Auth or classroom request is performed.
final class _ScriptedTransport implements AuthTransport {
  final requests = <AuthRequest>[];
  FutureOr<AuthResponse> Function(AuthRequest) rpc = (_) =>
      AuthResponse(200, snapshotFixture());
  @override
  Future<AuthResponse> send(AuthRequest request) async {
    requests.add(request);
    if (request.uri.path == '/functions/v1/geodecoder-auth') {
      final claims = base64Url
          .encode(
            utf8.encode(
              jsonEncode({
                'sub': teacherA,
                'session_id': 'verified-fixture-session',
                'exp': 2200000000,
              }),
            ),
          )
          .replaceAll('=', '');
      return AuthResponse(200, {
        'session': <String, dynamic>{
          'access_token': 'fixture.$claims.signature',
          'refresh_token': 'fixture-refresh',
          'user': {'id': teacherA},
        },
      });
    }
    if (request.uri.path == '/auth/v1/user') {
      return const AuthResponse(200, {
        'id': teacherA,
        'email': 'teacher@example.com',
      });
    }
    if (request.uri.path == '/rest/v1/rpc/geo_action') return rpc(request);
    throw StateError('Unscripted test request');
  }

  @override
  void close() {}
}

/// Test-only protected-store port; this is not Android Keystore evidence.
final class _MemoryProtectedStore implements SessionStore {
  String? _value;
  @override
  Future<Result<String?>> read() async => Success(_value);
  @override
  Future<Result<void>> write(String serializedSession) async {
    _value = serializedSession;
    return const Success(null);
  }

  @override
  Future<Result<void>> clear() async {
    _value = null;
    return const Success(null);
  }
}
