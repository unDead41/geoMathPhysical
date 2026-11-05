import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/data/cloud_gateway.dart';

final class AccountProfile {
  const AccountProfile({
    required this.id,
    required this.username,
    required this.displayName,
    required this.role,
    required this.avatar,
  });
  final String id;
  final String username;
  final String displayName;
  final AccountRole role;
  final String avatar;
  static AccountProfile? parse(Object? value, ActorBinding actor) {
    if (value is! Map ||
        value['id'] != actor.userId ||
        value['username'] is! String ||
        value['display_name'] is! String ||
        !['student', 'teacher'].contains(value['role'])) {
      return null;
    }
    final avatar = value['avatar'] ?? 'initial';
    if (!ProfileRepository.avatars.contains(avatar) ||
        !AccountValidation.validUsername(value['username'] as String) ||
        !AccountValidation.validDisplayName(value['display_name'] as String)) {
      return null;
    }
    return AccountProfile(
      id: value['id'] as String,
      username: value['username'] as String,
      displayName: value['display_name'] as String,
      role: value['role'] == 'teacher'
          ? AccountRole.teacher
          : AccountRole.student,
      avatar: avatar as String,
    );
  }
}

abstract class ProfileRepository {
  static const avatars = [
    'initial',
    'cube',
    'cuboid',
    'pyramid',
    'cylinder',
    'cone',
  ];
  AuthSession get sessions;
  bool get configured;
  Future<Result<AccountProfile?>> load(ActorBinding actor);
  Future<Result<AccountProfile>> update(
    ActorBinding actor, {
    required String displayName,
    required String avatar,
  });
  Future<Result<AccountProfile>> complete(
    ActorBinding actor, {
    required String username,
    required String displayName,
    required AccountRole role,
  });
}

final class GatewayProfileRepository implements ProfileRepository {
  const GatewayProfileRepository(this.gateway);
  final CloudGateway gateway;
  @override
  AuthSession get sessions => gateway.sessions;
  @override
  bool get configured => gateway.configured;
  @override
  Future<Result<AccountProfile?>> load(ActorBinding actor) async {
    final response = await gateway.rpc(
      name: 'geo_action',
      parameters: const {'action': 'snapshot', 'payload': <String, Object?>{}},
      actor: actor,
    );
    if (response case Failed<CloudReply>(:final failure)) {
      return Failed(failure);
    }
    if (!sessions.isCurrent(actor)) {
      return const Failed(
        AppFailure(code: FailureCode.stale, message: 'profile.changed'),
      );
    }
    final reply = response.valueOrNull!;
    if (reply.errorCode != null) return Failed(_denial(reply.errorCode!));
    if (reply.data['profile'] == null) return const Success(null);
    final profile = AccountProfile.parse(reply.data['profile'], actor);
    if (profile == null) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'profile.invalidResponse',
        ),
      );
    }
    return Success(profile);
  }

  @override
  Future<Result<AccountProfile>> update(
    ActorBinding actor, {
    required String displayName,
    required String avatar,
  }) async {
    if (!AccountValidation.validDisplayName(displayName) ||
        !ProfileRepository.avatars.contains(avatar)) {
      return const Failed(
        AppFailure(code: FailureCode.invalid, message: 'profile.invalid'),
      );
    }
    // Only the canonical two mutable fields are sent; role is server-owned.
    return _write(actor, 'geo_action', {
      'action': 'update_profile',
      'payload': {'display_name': displayName.trim(), 'avatar': avatar},
    });
  }

  @override
  Future<Result<AccountProfile>> complete(
    ActorBinding actor, {
    required String username,
    required String displayName,
    required AccountRole role,
  }) async {
    if (!AccountValidation.validUsername(username) ||
        !AccountValidation.validDisplayName(displayName)) {
      return const Failed(
        AppFailure(code: FailureCode.invalid, message: 'profile.invalid'),
      );
    }
    return _write(actor, 'geo_complete_profile', {
      'username': AccountValidation.username(username),
      'display_name': displayName.trim(),
      'role': role.name,
    });
  }

  Future<Result<AccountProfile>> _write(
    ActorBinding actor,
    String name,
    Map<String, Object?> parameters,
  ) async {
    final response = await gateway.rpc(
      name: name,
      parameters: parameters,
      actor: actor,
    );
    if (response case Failed<CloudReply>(:final failure)) {
      return Failed(failure);
    }
    if (!sessions.isCurrent(actor)) {
      return const Failed(
        AppFailure(code: FailureCode.stale, message: 'profile.changed'),
      );
    }
    final reply = response.valueOrNull!;
    if (reply.errorCode != null) return Failed(_denial(reply.errorCode!));
    final profile = AccountProfile.parse(reply.data['profile'], actor);
    if (profile == null) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'profile.invalidResponse',
        ),
      );
    }
    return Success(profile);
  }

  AppFailure _denial(String code) => AppFailure(
    code: switch (code) {
      'username_taken' => FailureCode.conflict,
      'auth_required' ||
      'unauthenticated' ||
      'auth_identity' => FailureCode.unauthorized,
      'invalid_profile' ||
      'invalid_name' ||
      'invalid_avatar' ||
      'invalid_account' => FailureCode.invalid,
      _ => FailureCode.unavailable,
    },
    message: code == 'username_taken'
        ? 'profile.usernameTaken'
        : 'profile.unavailable',
  );
}
