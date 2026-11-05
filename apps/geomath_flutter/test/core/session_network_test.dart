import 'dart:async';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/network/network_policy.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/session/session_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'guest partition survives reopen; same auth refresh preserves epoch',
    () async {
      final store = _GuestStore();
      final first = (await SessionController.open(guestStore: store))
          .valueOrNull!;
      final guest = first.current;
      await first.dispose();
      final reopened = (await SessionController.open(guestStore: store))
          .valueOrNull!;
      addTearDown(reopened.dispose);
      expect(reopened.current.partition, guest.partition);
      expect(reopened.current.sessionId, isNot(guest.sessionId));
      final changes = <int>[];
      final sub = reopened.bindings.listen((value) => changes.add(value.epoch));
      addTearDown(sub.cancel);
      reopened.bindUser(userId: 'owner-a', sessionId: 'session-a');
      final account = reopened.current;
      reopened.bindUser(userId: 'owner-a', sessionId: 'session-a');
      expect(reopened.current, account);
      expect(changes, [1]);
      reopened.changeScope('room:a');
      expect(reopened.isCurrent(account), isFalse);
      reopened.bindUser(userId: 'owner-b', sessionId: 'session-b');
      expect(reopened.current.partition, 'owner:owner-b');
      reopened.logout();
      expect(reopened.current.partition, guest.partition);
      expect(reopened.current.epoch, 4);
    },
  );

  test(
    'failed identity persistence does not claim a stable guest partition',
    () async {
      final store = _GuestStore()..failWrite = true;
      final result = await SessionController.open(guestStore: store);
      expect(result.failureOrNull?.code, FailureCode.storage);
      expect(result.valueOrNull, isNull);
      store.failWrite = false;
      store.value = 'not a valid stored identity';
      expect(
        (await SessionController.open(guestStore: store)).failureOrNull?.code,
        FailureCode.storage,
      );
    },
  );

  test(
    'protected adapter persists only through secure storage and clears',
    () async {
      FlutterSecureStorage.setMockInitialValues({});
      final store = SecureSessionStore();
      expect((await store.read()).valueOrNull, isNull);
      expect((await store.write('opaque-test-session')).isSuccess, isTrue);
      expect(
        (await SecureSessionStore().read()).valueOrNull,
        'opaque-test-session',
      );
      expect((await store.clear()).isSuccess, isTrue);
      expect((await store.read()).valueOrNull, isNull);
      final denied = SecureSessionStore(storage: _DeniedSecureStorage());
      expect(
        (await denied.write('opaque-test-session')).failureOrNull?.code,
        FailureCode.storage,
      );
    },
  );

  test(
    'late responses and callbacks after logout cannot affect another actor',
    () async {
      final session = SessionController.guest(
        guestId: 'guest',
        sessionId: 'session',
      );
      addTearDown(session.dispose);
      final policy = NetworkPolicy(sessions: session);
      final captured = session.current;
      final response = Completer<Result<String>>();
      final flight = policy.guard(captured, () => response.future);
      session.bindUser(userId: 'a', sessionId: 'a-session');
      response.complete(const Success('old-result'));
      expect((await flight).failureOrNull?.code, FailureCode.stale);
      var called = false;
      final rejected = await policy.guard(captured, () async {
        called = true;
        return const Success('unexpected');
      });
      expect(called, isFalse);
      expect(rejected.failureOrNull?.code, FailureCode.stale);
      final current = session.current;
      final currentResult = await policy.guard(
        current,
        () async => const Success('current'),
      );
      expect(currentResult.valueOrNull, 'current');
    },
  );

  test(
    'bounded retry respects Retry-After and halts terminal failures',
    () async {
      final session = SessionController.guest(
        guestId: 'guest',
        sessionId: 'session',
      );
      addTearDown(session.dispose);
      final policy = NetworkPolicy(
        sessions: session,
        clock: _Clock(),
        random: _Random(),
      );
      expect(policy.parseRetryAfter('2'), const Duration(seconds: 2));
      expect(
        policy.parseRetryAfter('Wed, 04 Nov 2026 00:00:10 GMT'),
        const Duration(seconds: 10),
      );
      expect(policy.parseRetryAfter('invalid'), isNull);
      expect(
        policy.retryDelay(
          0,
          const AppFailure(code: FailureCode.network, message: 'retry'),
        ),
        const Duration(milliseconds: 150),
      );
      expect(
        policy.retryDelay(
          0,
          const AppFailure(
            code: FailureCode.retryAfter,
            message: 'later',
            retryAfter: Duration(seconds: 90),
          ),
        ),
        const Duration(seconds: 90),
      );
      expect(
        policy.retryDelay(
          5,
          const AppFailure(code: FailureCode.network, message: 'stop'),
        ),
        isNull,
      );
      for (final code in [
        FailureCode.unavailable,
        FailureCode.unauthorized,
        FailureCode.invalid,
        FailureCode.conflict,
      ]) {
        expect(
          policy.retryDelay(0, AppFailure(code: code, message: 'stop')),
          isNull,
        );
      }
    },
  );
}

final class _GuestStore implements GuestIdentityStore {
  String? value;
  bool failWrite = false;

  @override
  Future<Result<String?>> read() async => Success(value);

  @override
  Future<Result<void>> write(String guestId) async {
    if (failWrite) {
      return const Failed(
        AppFailure(code: FailureCode.storage, message: 'Denied'),
      );
    }
    value = guestId;
    return const Success(null);
  }
}

final class _DeniedSecureStorage extends FlutterSecureStorage {
  @override
  Future<void> write({
    required String key,
    required String? value,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WindowsOptions? wOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
  }) async => throw StateError('denied');
}

final class _Clock implements Clock {
  @override
  DateTime now() => DateTime.utc(2026, 11, 4);
  @override
  int monotonicMilliseconds() => 0;
}

final class _Random implements RandomSource {
  @override
  double nextDouble() => 0;
  @override
  int nextInt(int maximum) => 0;
}
