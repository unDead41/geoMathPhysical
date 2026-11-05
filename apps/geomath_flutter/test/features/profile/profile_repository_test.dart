import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/auth/data/auth_repository.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/profile/data/profile_repository.dart';

class Gateway implements CloudGateway {
  Gateway(this.sessions);
  @override
  final SessionController sessions;
  @override
  bool configured = true;
  String? name;
  Map<String, Object?>? parameters;
  int calls = 0;
  FutureOr<Result<CloudReply>> Function()? response;
  @override
  Future<Result<CloudReply>> rpc({
    required String name,
    required Map<String, Object?> parameters,
    required ActorBinding actor,
  }) async {
    this.name = name;
    this.parameters = parameters;
    ++calls;
    return response?.call() ??
        Success(CloudReply(data: {'profile': profile()}));
  }
}

Map<String, Object?> profile({
  String id = 'alice',
  String role = 'teacher',
  String name = 'Alice Teacher',
}) => {
  'id': id,
  'username': 'alice',
  'display_name': name,
  'avatar': 'cube',
  'role': role,
};
void main() {
  late SessionController sessions;
  late Gateway gateway;
  late GatewayProfileRepository repository;
  setUp(() {
    sessions = SessionController.guest(
      guestId: 'installation',
      sessionId: 'guest',
    );
    sessions.bindUser(userId: 'alice', sessionId: 'session-alice');
    gateway = Gateway(sessions);
    repository = GatewayProfileRepository(gateway);
  });
  tearDown(() => sessions.dispose());
  test(
    'snapshot sends exact canonical action and receives server role',
    () async {
      final result = await repository.load(sessions.current);
      expect(gateway.name, 'geo_action');
      expect(gateway.parameters, {'action': 'snapshot', 'payload': {}});
      expect(result.valueOrNull?.role, AccountRole.teacher);
    },
  );
  test('profile update only sends display_name and canonical avatar', () async {
    final result = await repository.update(
      sessions.current,
      displayName: ' New Teacher ',
      avatar: 'cone',
    );
    expect(result.isSuccess, isTrue);
    expect(gateway.name, 'geo_action');
    expect(gateway.parameters, {
      'action': 'update_profile',
      'payload': {'display_name': 'New Teacher', 'avatar': 'cone'},
    });
  });
  test('provider completion uses exact authenticated RPC parameters', () async {
    final result = await repository.complete(
      sessions.current,
      username: ' Alice ',
      displayName: ' Alice Name ',
      role: AccountRole.student,
    );
    expect(result.valueOrNull?.role, AccountRole.teacher);
    expect(gateway.name, 'geo_complete_profile');
    expect(gateway.parameters, {
      'username': 'alice',
      'display_name': 'Alice Name',
      'role': 'student',
    });
  });
  test('validation rejects unsupported avatar without transport', () async {
    expect(
      (await repository.update(
        sessions.current,
        displayName: 'Valid Name',
        avatar: 'sphere',
      )).failureOrNull?.code,
      FailureCode.invalid,
    );
    expect(
      (await repository.update(
        sessions.current,
        displayName: 'x',
        avatar: 'cube',
      )).failureOrNull?.code,
      FailureCode.invalid,
    );
    expect(gateway.calls, 0);
  });
  test('explicit null profile is a genuine completion state', () async {
    gateway.response = () => Success(CloudReply(data: const {'profile': null}));
    final result = await repository.load(sessions.current);
    expect(result.isSuccess, isTrue);
    expect(result.valueOrNull, isNull);
  });
  test('snapshot requires an explicit profile field in its response', () async {
    for (final data in <Map<String, Object?>>[
      {},
      {'status': 'ok'},
      {'profile': false},
      {'profile': <Object?>[]},
    ]) {
      gateway.response = () => Success(CloudReply(data: data));
      final result = await repository.load(sessions.current);
      expect(result.isSuccess, isFalse);
      expect(result.failureOrNull?.code, FailureCode.invalid);
      expect(result.failureOrNull?.message, 'profile.invalidResponse');
    }
  });
  test('foreign profile identity and invalid server role rejected', () async {
    for (final data in [profile(id: 'bob'), profile(role: 'admin')]) {
      gateway.response = () => Success(CloudReply(data: {'profile': data}));
      expect(
        (await repository.load(sessions.current)).failureOrNull?.code,
        FailureCode.invalid,
      );
    }
  });
  test(
    'server username conflict remains conflict and never accepts caller role',
    () async {
      gateway.response = () => Success(
        CloudReply(
          data: const {
            'error': {'code': 'username_taken'},
          },
        ),
      );
      final result = await repository.complete(
        sessions.current,
        username: 'alice',
        displayName: 'Alice Name',
        role: AccountRole.teacher,
      );
      expect(result.failureOrNull?.code, FailureCode.conflict);
    },
  );
  test('session switch drops late save even if gateway implementation is permissive', () async {
    final delayed = Completer<Result<CloudReply>>();
    gateway.response = () => delayed.future;
    final result = repository.update(
      sessions.current,
      displayName: 'Alice Name',
      avatar: 'cube',
    );
    sessions.bindUser(userId: 'bob', sessionId: 'session-bob');
    delayed.complete(Success(CloudReply(data: {'profile': profile()})));
    expect((await result).failureOrNull?.code, FailureCode.stale);
  });
  test(
    'transport outcome remains network failure without automatic save retry',
    () async {
      gateway.response = () => const Failed(
        AppFailure(code: FailureCode.network, message: 'auth.network'),
      );
      final result = await repository.update(
        sessions.current,
        displayName: 'Alice Name',
        avatar: 'cube',
      );
      expect(result.failureOrNull?.code, FailureCode.network);
      expect(gateway.calls, 1);
    },
  );
}
