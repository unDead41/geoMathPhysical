import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/session/session_store.dart';
import 'package:geomath_flutter/features/auth/data/auth_repository.dart';
import 'package:geomath_flutter/features/auth/data/auth_transport.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_driver.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_links.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_repository.dart';
import 'package:geomath_flutter/features/profile/data/profile_repository.dart';

const config = PublicBackendConfiguration(
  url: 'https://example.supabase.co',
  publishableKey: 'sb_publishable_abcdefghijklmnopqrstuvwxyz',
);
Map<String, Object?> session(String user, {String? sid, int? expires}) => {
  'access_token':
      'header.${base64Url.encode(utf8.encode(jsonEncode({'sub': user, 'session_id': sid ?? 'session-$user', 'exp': expires ?? 2200000000}))).replaceAll('=', '')}.signature',
  'refresh_token': 'refresh-$user',
  'user': {'id': user},
};
AuthResponse account(String user, {bool googleOnly = false}) =>
    AuthResponse(200, {
      'id': user,
      'email': '$user@example.com',
      'app_metadata': {
        'providers': [googleOnly ? 'google' : 'email'],
      },
    });

class Store implements SessionStore {
  String? value;
  int reads = 0;
  int writes = 0;
  int clears = 0;
  bool failWrite = false;
  bool failRead = false;
  Future<void> Function()? beforeWrite;
  @override
  Future<Result<String?>> read() async {
    ++reads;
    return failRead
        ? const Failed(AppFailure(code: FailureCode.storage, message: 'failed'))
        : Success(value);
  }

  @override
  Future<Result<void>> write(String text) async {
    ++writes;
    await beforeWrite?.call();
    if (failWrite) {
      return const Failed(
        AppFailure(code: FailureCode.storage, message: 'failed'),
      );
    }
    value = text;
    return const Success(null);
  }

  @override
  Future<Result<void>> clear() async {
    ++clears;
    value = null;
    return const Success(null);
  }
}

class Transport implements AuthTransport {
  final requests = <AuthRequest>[];
  late FutureOr<AuthResponse> Function(AuthRequest) reply;
  bool closed = false;
  @override
  Future<AuthResponse> send(AuthRequest request) async {
    requests.add(request);
    return reply(request);
  }

  @override
  void close() {
    closed = true;
  }
}

class QuietLinks implements AuthLinks {
  @override
  Future<Uri?> initial() async => null;
  @override
  Stream<Uri> get callbacks => const Stream.empty();
}

class StreamLinks implements AuthLinks {
  StreamLinks({this.initialValue});
  final Uri? initialValue;
  final controller = StreamController<Uri>.broadcast();
  @override
  Future<Uri?> initial() async => initialValue;
  @override
  Stream<Uri> get callbacks => controller.stream;
}

class Driver extends NativeAuthDriver {
  int launches = 0;
  int exchanges = 0;
  int recoveries = 0;
  int resends = 0;
  String user = 'google';
  Object? failure;
  Future<Map<String, Object?>>? exchangeReply;
  Completer<void>? exchangeStarted;
  @override
  Future<bool> google(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
  ) async {
    ++launches;
    if (failure case final error?) throw error;
    await storage.setItem(key: 'verifier', value: 'secret-verifier');
    return true;
  }

  @override
  Future<void> recover(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
    String email,
  ) async {
    ++recoveries;
    await storage.setItem(key: 'verifier', value: 'secret-verifier');
  }

  @override
  Future<void> resend(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
    String email,
  ) async {
    ++resends;
    await storage.setItem(key: 'verifier', value: 'secret-verifier');
  }

  @override
  Future<Map<String, Object?>> exchange(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
    String code,
  ) async {
    ++exchanges;
    expect(await storage.getItem(key: 'verifier'), 'secret-verifier');
    await storage.removeItem(key: 'verifier');
    exchangeStarted?.complete();
    return exchangeReply == null ? session(user) : await exchangeReply!;
  }
}

void main() {
  late SessionController sessions;
  late Store store;
  late Transport transport;
  late Driver driver;
  NativeAuthRepository? repository;
  setUp(() {
    sessions = SessionController.guest(
      guestId: 'installation',
      sessionId: 'guest-session',
    );
    store = Store();
    transport = Transport();
    driver = Driver();
    transport.reply = (request) {
      if (request.uri.path.endsWith('/user')) {
        final token = request.headers['Authorization']!;
        final payload = jsonDecode(
          utf8.decode(
            base64Url.decode(base64Url.normalize(token.split('.')[1])),
          ),
        ) as Map;
        return account(payload['sub'] as String);
      }
      if (request.uri.path.endsWith('/settings')) {
        return const AuthResponse(200, {
          'external': {'google': true},
        });
      }
      if (request.uri.path.endsWith('/geodecoder-auth')) {
        return AuthResponse(200, {
          'session': session(request.body!['username'] as String),
        });
      }
      return const AuthResponse(200, {});
    };
  });
  tearDown(() async {
    repository?.dispose();
    repository = null;
    await sessions.dispose();
  });
  NativeAuthRepository create({
    bool ready = false,
    bool configured = true,
    AuthLinks? links,
  }) => repository = NativeAuthRepository(
    sessions: sessions,
    store: store,
    configuration: configured ? config : const PublicBackendConfiguration(),
    transport: transport,
    driver: driver,
    nativeCallbackReady: ready,
    links: links ?? QuietLinks(),
  );
  Future<void> login(
    NativeAuthRepository auth, [
    String user = 'alice',
  ]) async => expect(
    (await auth.login(identifier: user, password: '  password  ')).isSuccess,
    isTrue,
  );

  test('no config preserves usable guest without store or network', () async {
    final auth = create(configured: false);
    final before = sessions.current;
    expect((await auth.restore()).failureOrNull?.code, FailureCode.unavailable);
    expect(sessions.current, before);
    expect(store.reads, 0);
    expect(transport.requests, isEmpty);
  });
  test(
    'login uses gateway normalization and preserves password verbatim',
    () async {
      final auth = create();
      await login(auth, ' Alice ');
      expect(
        transport.requests.first.uri.path,
        '/functions/v1/geodecoder-auth',
      );
      expect(transport.requests.first.body, {
        'action': 'login',
        'username': 'alice',
        'password': '  password  ',
      });
      expect(sessions.current.userId, 'alice');
      expect(auth.identity?.id, 'alice');
      expect(store.value, contains('refresh-alice'));
    },
  );
  test('server identity mismatch never adopts or persists', () async {
    final auth = create();
    transport.reply = (request) => request.uri.path.endsWith('/user')
        ? account('mallory')
        : AuthResponse(200, {'session': session('alice')});
    expect(
      (await auth.login(
        identifier: 'alice',
        password: 'password123',
      )).failureOrNull?.code,
      FailureCode.unauthorized,
    );
    expect(sessions.current.isGuest, isTrue);
    expect(store.writes, 0);
  });
  test('protected write failure never claims login', () async {
    final auth = create();
    store.failWrite = true;
    expect(
      (await auth.login(
        identifier: 'alice',
        password: 'password123',
      )).failureOrNull?.code,
      FailureCode.storage,
    );
    expect(sessions.current.isGuest, isTrue);
    expect(auth.identity, isNull);
  });
  test(
    'newer login supersedes an older network response before adoption',
    () async {
      final auth = create();
      final delayed = Completer<AuthResponse>();
      final started = Completer<void>();
      final normal = transport.reply;
      transport.reply = (request) {
        if (request.body?['username'] == 'alice') {
          started.complete();
          return delayed.future;
        }
        return normal(request);
      };
      final old = auth.login(identifier: 'alice', password: 'password123');
      await started.future;
      final newer = auth.login(identifier: 'bob', password: 'password123');
      delayed.complete(AuthResponse(200, {'session': session('alice')}));
      expect((await old).failureOrNull?.code, FailureCode.stale);
      expect((await newer).isSuccess, isTrue);
      expect(sessions.current.userId, 'bob');
      expect(store.value, isNot(contains('refresh-alice')));
    },
  );
  test(
    'logout intent prevents an outstanding login resurrecting a session',
    () async {
      final auth = create();
      final delayed = Completer<AuthResponse>();
      final started = Completer<void>();
      transport.reply = (_) {
        started.complete();
        return delayed.future;
      };
      final old = auth.login(identifier: 'alice', password: 'password123');
      await started.future;
      final logout = auth.logout(LogoutScope.local);
      delayed.complete(AuthResponse(200, {'session': session('alice')}));
      expect((await old).failureOrNull?.code, FailureCode.stale);
      expect((await logout).isSuccess, isTrue);
      expect(sessions.current.isGuest, isTrue);
      expect(store.value, isNull);
    },
  );
  test('signup exact wire acknowledges confirmation without adopting returned tokens', () async {
    final auth = create();
    final actor = sessions.current;
    transport.reply = (_) => AuthResponse(200, {
      'confirmation_required': true,
      'session': session('evil'),
    });
    final result = await auth.signup(
      email: ' Learner@Example.com ',
      username: ' Learner ',
      password: 'password123',
      displayName: ' Learner Name ',
      role: AccountRole.student,
    );
    expect(result.isSuccess, isTrue);
    expect(sessions.current, actor);
    expect(store.writes, 0);
    expect(transport.requests.single.body, {
      'action': 'signup',
      'email': 'learner@example.com',
      'username': 'learner',
      'password': 'password123',
      'display_name': 'Learner Name',
      'role': 'student',
    });
  });
  test('full binding scope change discards pending RPC response', () async {
    final auth = create();
    await login(auth);
    final actor = sessions.current;
    final delayed = Completer<AuthResponse>();
    final started = Completer<void>();
    transport.reply = (_) {
      started.complete();
      return delayed.future;
    };
    final pending = auth.rpc(
      name: 'geo_action',
      parameters: const {'action': 'snapshot', 'payload': {}},
      actor: actor,
    );
    await started.future;
    sessions.changeScope('other-room');
    delayed.complete(
      const AuthResponse(200, {
        'profile': {'id': 'alice'},
      }),
    );
    expect((await pending).failureOrNull?.code, FailureCode.stale);
  });
  test(
    'RPC captures old credential and drops reply after an account switch',
    () async {
      final auth = create();
      await login(auth);
      final actor = sessions.current;
      final delayed = Completer<AuthResponse>();
      final started = Completer<void>();
      final normal = transport.reply;
      transport.reply = (request) {
        if (request.uri.path.contains('/rpc/')) {
          started.complete();
          return delayed.future;
        }
        return normal(request);
      };
      final rpc = auth.rpc(
        name: 'geo_action',
        parameters: const {'action': 'snapshot', 'payload': {}},
        actor: actor,
      );
      await started.future;
      final sent = transport.requests.last;
      await login(auth, 'bob');
      expect(
        sent.headers['Authorization'],
        'Bearer ${session('alice')['access_token']}',
      );
      delayed.complete(const AuthResponse(200, {'ok': true}));
      expect((await rpc).failureOrNull?.code, FailureCode.stale);
      expect(sessions.current.userId, 'bob');
    },
  );
  test('RPC application denial is Success and error is code only', () async {
    final auth = create();
    await login(auth);
    transport.reply = (_) => const AuthResponse(200, {
      'error': {'code': 'forbidden', 'message': 'SECRET'},
      'access_token': 'SECRET',
      'nested': {'refresh_token': 'SECRET', 'ok': true},
    });
    final result = await auth.rpc(
      name: 'geo_action',
      parameters: const {},
      actor: sessions.current,
    );
    expect(result.isSuccess, isTrue);
    expect(result.valueOrNull?.errorCode, 'forbidden');
    expect(jsonEncode(result.valueOrNull!.data), isNot(contains('SECRET')));
    expect(
      () => result.valueOrNull!.data['new'] = true,
      throwsUnsupportedError,
    );
  });
  test('RPC HTTP429 is retry-after Failed and is not replayed', () async {
    final auth = create();
    await login(auth);
    final count = transport.requests.length;
    transport.reply = (_) =>
        const AuthResponse(429, {'message': 'SECRET'}, retryAfter: '60');
    final result = await auth.rpc(
      name: 'geo_action',
      parameters: const {},
      actor: sessions.current,
    );
    expect(result.failureOrNull?.code, FailureCode.retryAfter);
    expect(result.failureOrNull?.retryAfter, const Duration(seconds: 60));
    expect(transport.requests.length, count + 1);
  });
  for (final status in [500, 502, 503, 504, 507, 599]) {
    test(
      'RPC HTTP$status is transient with no automatic mutation replay',
      () async {
        final auth = create();
        await login(auth);
        final count = transport.requests.length;
        final actor = sessions.current;
        transport.reply = (_) =>
            AuthResponse(status, const {'message': 'SECRET'}, retryAfter: '37');
        final result = await auth.rpc(
          name: 'geo_sync_events',
          parameters: const {},
          actor: actor,
        );
        expect(result.failureOrNull?.code, FailureCode.network);
        expect(result.failureOrNull?.retryAfter, const Duration(seconds: 37));
        expect(result.failureOrNull?.message, isNot(contains('SECRET')));
        expect(transport.requests.length, count + 1);
        expect(sessions.current, actor);
      },
    );
  }
  for (final status in [404, 405, 501]) {
    test('missing RPC HTTP$status remains unavailable', () async {
      final auth = create();
      await login(auth);
      final count = transport.requests.length;
      transport.reply = (_) => AuthResponse(status, const {});
      final result = await auth.rpc(
        name: 'geo_sync_events',
        parameters: const {},
        actor: sessions.current,
      );
      expect(result.failureOrNull?.code, FailureCode.unavailable);
      expect(transport.requests.length, count + 1);
    });
  }
  test('profile save HTTP503 preserves network unknown outcome', () async {
    final auth = create();
    await login(auth);
    final count = transport.requests.length;
    transport.reply = (_) => const AuthResponse(503, {}, retryAfter: '37');
    final result = await GatewayProfileRepository(
      auth,
    ).update(sessions.current, displayName: 'Retained Teacher', avatar: 'cube');
    expect(result.failureOrNull?.code, FailureCode.network);
    expect(result.failureOrNull?.retryAfter, const Duration(seconds: 37));
    expect(transport.requests.length, count + 1);
  });
  test(
    'network outcome stays Failed with no automatic mutation replay',
    () async {
      final auth = create();
      await login(auth);
      final count = transport.requests.length;
      transport.reply = (_) => throw TimeoutException('SECRET');
      final result = await auth.rpc(
        name: 'geo_action',
        parameters: const {'action': 'update_profile'},
        actor: sessions.current,
      );
      expect(result.failureOrNull?.code, FailureCode.network);
      expect(result.failureOrNull?.message, 'auth.network');
      expect(transport.requests.length, count + 1);
    },
  );
  test(
    'token refresh preserves actor epoch for unchanged user and session',
    () async {
      final auth = create();
      final normal = transport.reply;
      transport.reply = (request) {
        if (request.uri.path.endsWith('/geodecoder-auth')) {
          return AuthResponse(200, {'session': session('alice', expires: 1)});
        }
        if (request.uri.queryParameters['grant_type'] == 'refresh_token') {
          return AuthResponse(200, session('alice'));
        }
        return normal(request);
      };
      await login(auth);
      final before = sessions.current;
      final result = await auth.rpc(
        name: 'geo_action',
        parameters: const {},
        actor: before,
      );
      expect(result.isSuccess, isTrue);
      expect(sessions.current, before);
      expect(
        transport.requests
            .where(
              (r) => r.uri.queryParameters['grant_type'] == 'refresh_token',
            )
            .length,
        1,
      );
    },
  );
  test(
    'restore refreshes and server verifies before binding, memoizes success',
    () async {
      store.value = jsonEncode({
        'version': 1,
        'session': {...session('alice'), 'user_id': 'alice'},
      });
      final auth = create();
      final normal = transport.reply;
      transport.reply = (r) =>
          r.uri.queryParameters['grant_type'] == 'refresh_token'
          ? AuthResponse(200, session('alice'))
          : normal(r);
      expect((await auth.restore()).isSuccess, isTrue);
      expect(sessions.current.userId, 'alice');
      await auth.restore();
      expect(store.reads, 1);
    },
  );
  test('restore storage failure is retryable without changing guest', () async {
    final auth = create();
    final actor = sessions.current;
    store.failRead = true;
    expect((await auth.restore()).failureOrNull?.code, FailureCode.storage);
    store.failRead = false;
    expect((await auth.restore()).isSuccess, isTrue);
    expect(store.reads, 2);
    expect(sessions.current, actor);
  });
  test(
    'logout401 keeps actor and protected data, never claims revocation',
    () async {
      final auth = create();
      await login(auth);
      final actor = sessions.current;
      transport.reply = (_) => const AuthResponse(401, {});
      expect(
        (await auth.logout(LogoutScope.global)).failureOrNull?.code,
        FailureCode.unauthorized,
      );
      expect(sessions.current, actor);
      expect(store.value, isNotNull);
      expect(transport.requests.last.uri.queryParameters, {'scope': 'global'});
    },
  );
  test('other-session logout leaves current actor intact', () async {
    final auth = create();
    await login(auth);
    final actor = sessions.current;
    expect((await auth.logout(LogoutScope.others)).isSuccess, isTrue);
    expect(sessions.current, actor);
    expect(store.clears, 0);
    expect(transport.requests.last.uri.queryParameters, {'scope': 'others'});
  });
  test('plain reset route cannot authorize password reset', () async {
    final auth = create();
    await login(auth);
    final count = transport.requests.length;
    expect(
      (await auth.resetPassword('newpassword123')).failureOrNull?.code,
      FailureCode.unauthorized,
    );
    expect(transport.requests.length, count);
  });
  test(
    'callback disabled makes no provider request or browser launch',
    () async {
      final auth = create();
      expect(
        (await auth.startGoogle()).failureOrNull?.code,
        FailureCode.unavailable,
      );
      expect(transport.requests, isEmpty);
      expect(driver.launches, 0);
    },
  );
  test('Google server capability is required', () async {
    final auth = create(ready: true);
    transport.reply = (_) => const AuthResponse(200, {
      'external': {'google': false},
    });
    expect(
      (await auth.startGoogle()).failureOrNull?.code,
      FailureCode.unavailable,
    );
    expect(driver.launches, 0);
  });
  test(
    'warm PKCE callback verifies, consumes once, never exposes verifier',
    () async {
      final auth = create(ready: true);
      expect((await auth.startGoogle()).isSuccess, isTrue);
      expect(driver.launches, 1);
      expect(store.value, contains('secret-verifier'));
      final callback = Uri.parse(
        'com.geomath.dev://auth/callback?code=opaque-code',
      );
      expect((await auth.handleCallback(callback)).isSuccess, isTrue);
      expect(sessions.current.userId, 'google');
      expect(auth.recoveryRequired, isFalse);
      expect(store.value, isNot(contains('secret-verifier')));
      expect(
        (await auth.handleCallback(callback)).failureOrNull?.code,
        FailureCode.invalid,
      );
      expect(driver.exchanges, 1);
    },
  );
  test('foreign or fragment callback never exchanges', () async {
    final auth = create(ready: true);
    await auth.startGoogle();
    for (final url in [
      'https://evil.example/auth/callback?code=x',
      'com.geomath.dev://auth/callback?code=x&state=bad',
      'com.geomath.dev://auth/callback#access_token=secret',
      'com.geomath.dev://auth/callback?code=x&code=y',
    ]) {
      expect(
        (await auth.handleCallback(Uri.parse(url))).failureOrNull?.code,
        FailureCode.invalid,
      );
    }
    expect(driver.exchanges, 0);
  });
  test(
    'scope change invalidates pending callback even with same account ID',
    () async {
      final auth = create(ready: true);
      await auth.startGoogle();
      sessions.changeScope('different');
      expect(
        (await auth.handleCallback(
          Uri.parse('com.geomath.dev://auth/callback?code=x'),
        )).failureOrNull?.code,
        FailureCode.invalid,
      );
      expect(driver.exchanges, 0);
    },
  );
  test('recovery requires a verified same-process PKCE callback', () async {
    final auth = create(ready: true);
    driver.user = 'alice';
    expect((await auth.requestRecovery('alice@example.com')).isSuccess, isTrue);
    expect(auth.recoveryRequired, isFalse);
    expect(
      (await auth.handleCallback(
        Uri.parse('com.geomath.dev://auth/callback?code=recovery'),
      )).isSuccess,
      isTrue,
    );
    expect(auth.recoveryRequired, isTrue);
  });
  test(
    'session list rejects identifiers and requires one current record',
    () async {
      final auth = create();
      await login(auth);
      final valid = {
        'server_now': '2026-11-05T00:00:00Z',
        'capabilities': {'revoke_individual': false},
        'sessions': [
          {
            'is_current': true,
            'started_at': null,
            'user_agent': null,
            'status': 'recorded',
          },
        ],
        'truncated': false,
      };
      transport.reply = (_) => AuthResponse(200, valid);
      expect(
        (await auth.securitySessions()).valueOrNull?.rows.single.isCurrent,
        isTrue,
      );
      (valid['sessions'] as List).first['id'] = 'must-not-leak';
      expect(
        (await auth.securitySessions()).failureOrNull?.code,
        FailureCode.invalid,
      );
    },
  );
  test('CloudReply strips nested secrets and malformed error messages', () {
    final reply = CloudReply(
      data: {
        'error': {'code': 'not safe code', 'message': 'SECRET'},
        'rows': [
          {'provider_token': 'SECRET', 'score': 1},
        ],
      },
    );
    expect(reply.errorCode, 'request_failed');
    expect(jsonEncode(reply.data), isNot(contains('SECRET')));
  });
  test(
    'validators preserve canonical bounds and reject name control characters',
    () {
      expect(AccountValidation.validUsername('ab'), isFalse);
      expect(AccountValidation.validUsername('A_bc'), isTrue);
      expect(AccountValidation.validPassword('123456789'), isFalse);
      expect(AccountValidation.validPassword(' 12345678 '), isTrue);
      expect(AccountValidation.validDisplayName('🙂🙂'), isTrue);
      expect(AccountValidation.validDisplayName('ab\ncd'), isFalse);
      expect(AccountValidation.validEmail('bad email@example.com'), isFalse);
    },
  );
  test('cold start maps a protected guest PKCE intent only to the same installation', () async {
    final old = create(ready: true);
    await old.startGoogle();
    final saved = store.value;
    expect(saved, isNotNull);
    old.dispose();
    await sessions.dispose();
    sessions = SessionController.guest(
      guestId: 'installation',
      sessionId: 'fresh-boot',
    );
    final auth = create(ready: true);
    expect((await auth.restore()).isSuccess, isTrue);
    expect(sessions.current.sessionId, 'fresh-boot');
    expect(
      (await auth.handleCallback(
        Uri.parse('com.geomath.dev://auth/callback?code=cold-code'),
      )).isSuccess,
      isTrue,
    );
    expect(sessions.current.userId, 'google');
    expect(driver.exchanges, 1);
    expect(store.value, isNot(contains('cold-code')));
  });
  test('cold start rejects another installation and expired intent', () async {
    final old = create(ready: true);
    await old.startGoogle();
    final saved = jsonDecode(store.value!) as Map<String, dynamic>;
    old.dispose();
    await sessions.dispose();
    sessions = SessionController.guest(
      guestId: 'different-installation',
      sessionId: 'fresh-boot',
    );
    var auth = create(ready: true);
    expect((await auth.restore()).isSuccess, isTrue);
    expect(
      (await auth.handleCallback(
        Uri.parse('com.geomath.dev://auth/callback?code=x'),
      )).failureOrNull?.code,
      FailureCode.invalid,
    );
    auth.dispose();
    await sessions.dispose();
    sessions = SessionController.guest(
      guestId: 'installation',
      sessionId: 'another-boot',
    );
    (saved['pending'] as Map)['expires'] = '2000-01-01T00:00:00Z';
    store.value = jsonEncode(saved);
    auth = create(ready: true);
    await auth.restore();
    expect(
      (await auth.handleCallback(
        Uri.parse('com.geomath.dev://auth/callback?code=x'),
      )).failureOrNull?.code,
      FailureCode.invalid,
    );
    expect(driver.exchanges, 0);
  });
  test(
    'failed intervening login durably cancels previous provider intent',
    () async {
      final auth = create(ready: true);
      await auth.startGoogle();
      transport.reply = (_) => const AuthResponse(401, {});
      expect(
        (await auth.login(
          identifier: 'alice',
          password: 'password123',
        )).failureOrNull?.code,
        FailureCode.unauthorized,
      );
      final envelope = jsonDecode(store.value!) as Map;
      expect(envelope['pending'], isEmpty);
      expect(envelope['pkce'], isEmpty);
      expect(
        (await auth.handleCallback(
          Uri.parse('com.geomath.dev://auth/callback?code=x'),
        )).failureOrNull?.code,
        FailureCode.invalid,
      );
    },
  );
  test(
    'cold signed-in callback requires matching refreshed verified session',
    () async {
      final old = create(ready: true);
      await login(old);
      await old.startGoogle();
      old.dispose();
      await sessions.dispose();
      sessions = SessionController.guest(
        guestId: 'installation',
        sessionId: 'fresh-boot',
      );
      final normal = transport.reply;
      transport.reply = (request) =>
          request.uri.queryParameters['grant_type'] == 'refresh_token'
          ? AuthResponse(200, session('alice'))
          : normal(request);
      final auth = create(ready: true);
      expect((await auth.restore()).isSuccess, isTrue);
      expect(sessions.current.userId, 'alice');
      expect(
        (await auth.handleCallback(
          Uri.parse('com.geomath.dev://auth/callback?code=cold-code'),
        )).isSuccess,
        isTrue,
      );
      expect(sessions.current.userId, 'google');
    },
  );
  test(
    'legacy recovery sends exact 32-hex code and never adopts a session',
    () async {
      final auth = create();
      final actor = sessions.current;
      transport.reply = (_) => const AuthResponse(200, {'message': 'updated'});
      expect(
        (await auth.recoverLegacy(
          username: ' Legacy_User ',
          password: '  new password  ',
          recoveryCode: ' ABCDEF0123456789ABCDEF0123456789 ',
        )).isSuccess,
        isTrue,
      );
      expect(transport.requests.single.body, {
        'action': 'recover',
        'username': 'legacy_user',
        'password': '  new password  ',
        'recovery_code': 'abcdef0123456789abcdef0123456789',
      });
      expect(sessions.current, actor);
      expect(store.writes, 0);
    },
  );
  test(
    'legacy recovery rejects an email and six-digit OTP before network',
    () async {
      final auth = create();
      expect(
        (await auth.recoverLegacy(
          username: 'alice@example.com',
          password: 'password123',
          recoveryCode: '123456',
        )).failureOrNull?.code,
        FailureCode.invalid,
      );
      expect(transport.requests, isEmpty);
    },
  );
  test(
    'new login during protected write cannot leave stale credentials on disk',
    () async {
      final auth = create();
      final writing = Completer<void>();
      final release = Completer<void>();
      store.beforeWrite = () {
        store.beforeWrite = null;
        writing.complete();
        return release.future;
      };
      final old = auth.login(identifier: 'alice', password: 'password123');
      await writing.future;
      final newer = auth.login(identifier: 'bob', password: 'password123');
      release.complete();
      expect((await old).failureOrNull?.code, FailureCode.stale);
      expect((await newer).isSuccess, isTrue);
      expect(sessions.current.userId, 'bob');
      expect(store.value, contains('refresh-bob'));
      expect(store.value, isNot(contains('refresh-alice')));
    },
  );
  test('password change verifies current user and exact temporary password before update', () async {
    final auth = create();
    await login(auth);
    final before = sessions.current;
    final normal = transport.reply;
    transport.reply = (request) {
      if (request.uri.queryParameters['grant_type'] == 'password') {
        return AuthResponse(
          200,
          session('alice', sid: 'temporary-verification'),
        );
      }
      return normal(request);
    };
    final result = await auth.changePassword(
      password: ' new password ',
      currentPassword: ' old password ',
    );
    expect(result.isSuccess, isTrue);
    expect(sessions.current, before);
    final verify = transport.requests.firstWhere(
      (r) => r.uri.queryParameters['grant_type'] == 'password',
    );
    expect(verify.body, {
      'email': 'alice@example.com',
      'password': ' old password ',
    });
    final update = transport.requests.singleWhere((r) => r.method == 'PUT');
    expect(update.body, {
      'password': ' new password ',
      'current_password': ' old password ',
    });
    expect(store.value, isNot(contains('temporary-verification')));
    expect(
      update.headers['Authorization'],
      'Bearer ${session('alice', sid: 'temporary-verification')['access_token']}',
    );
    expect(transport.requests.last.uri.queryParameters, {'scope': 'local'});
    expect(
      transport.requests.last.headers['Authorization'],
      update.headers['Authorization'],
    );
  });
  test('password reauthentication for a foreign user never updates current account', () async {
    final auth = create();
    await login(auth);
    final normal = transport.reply;
    transport.reply = (request) =>
        request.uri.queryParameters['grant_type'] == 'password'
        ? AuthResponse(200, session('bob'))
        : normal(request);
    expect(
      (await auth.changePassword(
        password: 'newpassword123',
        currentPassword: 'oldpassword123',
      )).failureOrNull?.code,
      FailureCode.unauthorized,
    );
    expect(transport.requests.where((r) => r.method == 'PUT'), isEmpty);
  });
  test('Google-only account receives provider security guidance without password update', () async {
    final auth = create();
    await login(auth);
    transport.reply = (_) => account('alice', googleOnly: true);
    expect(
      (await auth.changePassword(
        password: 'newpassword123',
        currentPassword: 'oldpassword123',
      )).failureOrNull?.message,
      'auth.googleSecurity',
    );
    expect(transport.requests.where((r) => r.method == 'PUT'), isEmpty);
  });
  test('verified recovery resets password and requires actual global logout success', () async {
    final auth = create(ready: true);
    driver.user = 'alice';
    await auth.requestRecovery('alice@example.com');
    await auth.handleCallback(
      Uri.parse('com.geomath.dev://auth/callback?code=recovery'),
    );
    expect((await auth.resetPassword(' new password ')).isSuccess, isTrue);
    expect(sessions.current.isGuest, isTrue);
    expect(store.value, isNull);
    expect(transport.requests.singleWhere((r) => r.method == 'PUT').body, {
      'password': ' new password ',
    });
    expect(transport.requests.last.uri.queryParameters, {'scope': 'global'});
  });
  test(
    'password-updated logout denial cannot offer recovery reset again',
    () async {
      final auth = create(ready: true);
      driver.user = 'alice';
      await auth.requestRecovery('alice@example.com');
      await auth.handleCallback(
        Uri.parse('com.geomath.dev://auth/callback?code=recovery'),
      );
      final normal = transport.reply;
      transport.reply = (request) => request.uri.path.endsWith('/logout')
          ? const AuthResponse(401, {})
          : normal(request);
      expect(
        (await auth.resetPassword('newpassword123')).failureOrNull?.message,
        'auth.passwordUpdatedLogoutFailed',
      );
      expect(auth.recoveryRequired, isFalse);
      expect(sessions.current.userId, 'alice');
      expect(
        (await auth.resetPassword('newpassword123')).failureOrNull?.code,
        FailureCode.unauthorized,
      );
      expect(transport.requests.where((r) => r.method == 'PUT').length, 1);
    },
  );
  test(
    'synthetic legacy email and UTF16-overlong signup name fail before network',
    () async {
      final auth = create();
      expect(
        AccountValidation.validEmail('alice@accounts.geodecoder.invalid'),
        isFalse,
      );
      expect(
        (await auth.signup(
          email: 'alice@example.com',
          username: 'alice',
          password: 'password123',
          displayName: List.filled(31, '🙂').join(),
          role: AccountRole.student,
        )).failureOrNull?.code,
        FailureCode.invalid,
      );
      expect(transport.requests, isEmpty);
    },
  );
  test('native warm stream coalesces duplicate delivery without a false callback error', () async {
    final links = StreamLinks();
    final auth = create(ready: true, links: links);
    await auth.restore();
    await auth.startGoogle();
    final adopted = sessions.bindings.firstWhere(
      (actor) => actor.userId == 'google',
    );
    final callback = Uri.parse(
      'com.geomath.dev://auth/callback?code=warm-stream-code',
    );
    links.controller.add(callback);
    links.controller.add(callback);
    await adopted;
    await Future<void>.delayed(Duration.zero);
    expect(driver.exchanges, 1);
    expect(auth.callbackFailure, isNull);
    await links.controller.close();
  });
  test(
    'native initial link is processed only after protected cold-start restore',
    () async {
      final old = create(ready: true);
      await old.startGoogle();
      old.dispose();
      await sessions.dispose();
      sessions = SessionController.guest(
        guestId: 'installation',
        sessionId: 'fresh-boot',
      );
      final links = StreamLinks(
        initialValue: Uri.parse(
          'com.geomath.dev://auth/callback?code=initial-code',
        ),
      );
      final auth = create(ready: true, links: links);
      expect((await auth.restore()).isSuccess, isTrue);
      expect(sessions.current.userId, 'google');
      expect(driver.exchanges, 1);
      expect(auth.callbackFailure, isNull);
      await links.controller.close();
    },
  );
  test('late warm callback failure cannot alter a newer actor', () async {
    final links = StreamLinks();
    final auth = create(ready: true, links: links);
    await auth.restore();
    await auth.startGoogle();
    final exchange = Completer<Map<String, Object?>>();
    final started = Completer<void>();
    driver.exchangeReply = exchange.future;
    driver.exchangeStarted = started;
    links.controller.add(
      Uri.parse('com.geomath.dev://auth/callback?code=obsolete-warm-code'),
    );
    await started.future;
    sessions.bindUser(userId: 'bob', sessionId: 'session-bob');
    exchange.complete(session('google'));
    await Future<void>.delayed(Duration.zero);
    expect(auth.callbackFailure, isNull);
    expect(sessions.current.userId, 'bob');
    expect(auth.identity, isNull);
    await links.controller.close();
  });
  test(
    'SDK provider throttling maps to safe retry denial without raw text',
    () async {
      final auth = create(ready: true);
      driver.failure = const AuthException(
        'SECRET',
        statusCode: '429',
        code: 'over_request_rate_limit',
      );
      final result = await auth.startGoogle();
      expect(result.failureOrNull?.code, FailureCode.retryAfter);
      expect(result.failureOrNull?.message, 'auth.rateLimited');
      expect((jsonDecode(store.value!) as Map)['pending'], isEmpty);
    },
  );
  test('null error is a successful cloud reply without an invented denial', () {
    expect(
      CloudReply(data: const {'error': null, 'ok': true}).errorCode,
      isNull,
    );
  });
  test('current password accepts canonical nonempty legacy length while new password remains bounded', () async {
    final auth = create();
    await login(auth);
    final normal = transport.reply;
    transport.reply = (request) =>
        request.uri.queryParameters['grant_type'] == 'password'
        ? AuthResponse(200, session('alice', sid: 'temporary-verification'))
        : normal(request);
    expect(
      (await auth.changePassword(
        password: 'newpassword123',
        currentPassword: 'short',
      )).isSuccess,
      isTrue,
    );
  });
  test('an additional expired current row is rejected', () async {
    final auth = create();
    await login(auth);
    transport.reply = (_) => const AuthResponse(200, {
      'server_now': '2026-11-05T00:00:00Z',
      'capabilities': {'revoke_individual': false},
      'truncated': false,
      'sessions': [
        {
          'is_current': true,
          'started_at': null,
          'user_agent': null,
          'status': 'recorded',
        },
        {
          'is_current': true,
          'started_at': null,
          'user_agent': null,
          'status': 'expired',
        },
      ],
    });
    expect(
      (await auth.securitySessions()).failureOrNull?.code,
      FailureCode.invalid,
    );
  });
  for (final change in ['account', 'new-session', 'scope', 'dispose']) {
    test('late exceptional RPC result is stale after $change', () async {
      final auth = create();
      await login(auth);
      final actor = sessions.current;
      final delayed = Completer<AuthResponse>();
      final started = Completer<void>();
      transport.reply = (_) {
        started.complete();
        return delayed.future;
      };
      final pending = auth.rpc(
        name: 'geo_action',
        parameters: const {},
        actor: actor,
      );
      await started.future;
      switch (change) {
        case 'account':
          sessions.bindUser(userId: 'bob', sessionId: 'session-bob');
        case 'new-session':
          sessions.bindUser(userId: 'alice', sessionId: 'different-session');
        case 'scope':
          sessions.changeScope('different-room');
        case 'dispose':
          auth.dispose();
      }
      delayed.completeError(TimeoutException('SECRET'));
      final result = await pending;
      expect(result.failureOrNull?.code, FailureCode.stale);
      expect(result.failureOrNull?.message, 'auth.changed');
    });
  }
  test('RPC snapshots nested parameters before its first await', () async {
    final auth = create();
    await login(auth);
    final payload = <String, Object?>{
      'display_name': 'Original Name',
      'avatar': 'cube',
    };
    final pending = auth.rpc(
      name: 'geo_action',
      parameters: {'action': 'update_profile', 'payload': payload},
      actor: sessions.current,
    );
    payload['display_name'] = 'Changed After Call';
    expect((await pending).isSuccess, isTrue);
    expect(
      (transport.requests.last.body!['payload'] as Map)['display_name'],
      'Original Name',
    );
  });
}
