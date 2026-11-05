import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../auth/data/cloud_gateway.dart';
import '../domain/classroom_models.dart';

/// An online command. Wire keys are allowlisted before any transport call.
final class ClassroomCommand {
  ClassroomCommand(this.action, Map<String, Object?> payload)
    : payload = Map.unmodifiable(payload);
  final String action;
  final Map<String, Object?> payload;
  bool get mutation => action != 'snapshot' && action != 'heartbeat';
  bool get game => const {'answer', 'hint', 'skip', 'advance'}.contains(action);
  bool get management => const {
    'rename_class',
    'rename_room',
    'archive_class',
    'restore_class',
    'delete_class',
    'archive_room',
    'restore_room',
    'delete_room',
    'remove_member',
    'cancel_invite',
    'decline_invite',
  }.contains(action);

  bool get valid {
    final keys = _keys[action];
    if (keys == null || payload.keys.any((key) => !keys.contains(key))) {
      return false;
    }
    if (action != 'snapshot' &&
        action != 'heartbeat' &&
        !keys.every(payload.containsKey)) {
      return false;
    }
    for (final entry in payload.entries) {
      final value = entry.value;
      if (entry.key.endsWith('_id') || entry.key == 'id') {
        if (value is! String || !ClassroomValidation.uuid(value)) return false;
      }
      if (entry.key == 'expected_revision' && (value is! int || value < 0)) {
        return false;
      }
      if (entry.key == 'index' && (value is! int || value < 0 || value > 9)) {
        return false;
      }
      if (entry.key == 'name' &&
          (value is! String || !ClassroomValidation.name(value))) {
        return false;
      }
      if (entry.key == 'pin' &&
          (value is! String || !ClassroomValidation.pin(value))) {
        return false;
      }
      if (entry.key == 'username' &&
          (value is! String || !RegExp(r'^[a-z0-9_]{3,24}$').hasMatch(value))) {
        return false;
      }
      if (entry.key == 'status' &&
          !const {'open', 'playing', 'closed'}.contains(value)) {
        return false;
      }
      if (entry.key == 'target' && !const {'r1', 'r2'}.contains(value)) {
        return false;
      }
      if (entry.key == 'shape' &&
          !const {
            'cube',
            'cuboid',
            'pyramid',
            'cylinder',
            'cone',
          }.contains(value)) {
        return false;
      }
      if (entry.key == 'kind' &&
          !(action == 'rotate_pin'
                  ? const {'class', 'room'}
                  : const {'solid', 'net'})
              .contains(value)) {
        return false;
      }
    }
    return true;
  }

  static const _keys = <String, Set<String>>{
    'snapshot': {'room_id'},
    'heartbeat': {'room_id'},
    'create_class': {'name'},
    'create_room': {'class_id', 'name'},
    'invite': {'class_id', 'username'},
    'accept_invite': {'invite_id'},
    'cancel_invite': {'invite_id'},
    'decline_invite': {'invite_id'},
    'rotate_pin': {'kind', 'id'},
    'join_pin': {'pin'},
    'join_room': {'room_id'},
    'start_attempt': {'room_id'},
    'set_room': {'room_id', 'status'},
    'rename_class': {'class_id', 'expected_revision', 'name'},
    'rename_room': {'room_id', 'expected_revision', 'name'},
    'archive_class': {'class_id', 'expected_revision'},
    'restore_class': {'class_id', 'expected_revision'},
    'delete_class': {'class_id', 'expected_revision'},
    'archive_room': {'room_id', 'expected_revision'},
    'restore_room': {'room_id', 'expected_revision'},
    'delete_room': {'room_id', 'expected_revision'},
    'remove_member': {'class_id', 'user_id', 'expected_revision'},
    'answer': {'attempt_id', 'index', 'event_id', 'kind', 'shape', 'target'},
    'hint': {'attempt_id', 'index', 'event_id'},
    'skip': {'attempt_id', 'index', 'event_id'},
    'advance': {'attempt_id', 'index', 'event_id'},
  };
}

final class ClassroomResponse {
  const ClassroomResponse({
    this.snapshot,
    this.attempt,
    this.resultType,
    this.createdClassId,
    this.createdRoomId,
    this.deletedClassId,
    this.deletedRoomId,
    this.failure,
    this.serverCode,
    this.uncertain = false,
  });
  final ClassroomSnapshot? snapshot;
  final ClassroomAttempt? attempt;
  final String? resultType,
      createdClassId,
      createdRoomId,
      deletedClassId,
      deletedRoomId;
  final AppFailure? failure;
  final String? serverCode;
  final bool uncertain;
  bool get isSuccess => failure == null;
}

/// Borrows the sole Auth gateway; this repository never reads or stores tokens.
final class ClassroomRepository {
  ClassroomRepository({required this.gateway, required this.sessions});
  final CloudGateway gateway;
  final AuthSession sessions;
  bool get configured => gateway.configured;

  Future<ClassroomResponse> send(
    ClassroomCommand command,
    ActorBinding actor,
  ) async {
    if (!sessions.isCurrent(actor)) return _failed('stale', FailureCode.stale);
    if (!configured) return _failed('unavailable', FailureCode.unavailable);
    if (actor.isGuest) {
      return _failed('unauthenticated', FailureCode.unauthorized);
    }
    if (!command.valid) return _failed('invalid_payload', FailureCode.invalid);
    Result<CloudReply> result;
    try {
      result = await gateway.rpc(
        name: 'geo_action',
        parameters: {'action': command.action, 'payload': command.payload},
        actor: actor,
      );
    } catch (_) {
      return sessions.isCurrent(actor)
          ? _failed('network', FailureCode.network, uncertain: command.mutation)
          : _failed('stale', FailureCode.stale);
    }
    if (!sessions.isCurrent(actor)) return _failed('stale', FailureCode.stale);
    if (result case Failed<CloudReply>(:final failure)) {
      return ClassroomResponse(
        failure: AppFailure(
          code: failure.code,
          message: 'classroom.error.${failure.code.name}',
          retryAfter: failure.retryAfter,
        ),
        uncertain:
            command.mutation &&
            const {
              FailureCode.network,
              FailureCode.unexpected,
              FailureCode.cancelled,
              // The shared gateway also uses unavailable for a 503 response.
              // It cannot prove whether a mutation reached the server.
              FailureCode.unavailable,
            }.contains(failure.code),
      );
    }
    final reply = (result as Success<CloudReply>).value;
    if (reply.statusCode == 401 || reply.statusCode == 403) {
      return _failed('forbidden', FailureCode.unauthorized);
    }
    if (reply.statusCode == 429) {
      return _failed(
        'rate_limited',
        FailureCode.retryAfter,
        retryAfter: reply.retryAfter,
      );
    }
    if (reply.statusCode >= 500) {
      return _failed(
        'network',
        FailureCode.network,
        uncertain: command.mutation,
      );
    }
    final code = reply.errorCode;
    if (code != null) {
      return _failed(code, switch (code) {
        'forbidden' ||
        'unauthenticated' ||
        'profile_missing' ||
        'session-expired' => FailureCode.unauthorized,
        'conflict' || 'event_conflict' => FailureCode.conflict,
        'rate_limited' => FailureCode.retryAfter,
        'PGRST202' || '42883' || 'unavailable' => FailureCode.unavailable,
        _ => FailureCode.invalid,
      }, retryAfter: reply.retryAfter);
    }
    if (reply.statusCode < 200 || reply.statusCode >= 300) {
      return _failed(
        'invalid_response',
        FailureCode.invalid,
        uncertain: command.mutation,
      );
    }
    try {
      final data = reply.data;
      ClassroomSnapshot? snapshot;
      if (data.containsKey('profile')) {
        final parsed = ClassroomSnapshot.parse(data);
        if (parsed case Failed<ClassroomSnapshot>()) {
          throw const FormatException();
        }
        snapshot = parsed.valueOrNull!;
        if (snapshot.profile.id != actor.userId) {
          return _failed('stale', FailureCode.stale);
        }
      }
      final attempt = data['state'] is Map
          ? ClassroomAttempt.fromJson(
              Map<String, Object?>.from(data['state'] as Map),
            )
          : null;
      if (snapshot == null && attempt == null) throw const FormatException();
      final eventResult = data['result'];
      return ClassroomResponse(
        snapshot: snapshot,
        attempt: attempt,
        resultType: eventResult is Map ? eventResult['type'] as String? : null,
        createdClassId: data['class_id'] as String?,
        createdRoomId: data['room_id'] as String?,
        deletedClassId: data['deleted_class_id'] as String?,
        deletedRoomId: data['deleted_room_id'] as String?,
      );
    } catch (_) {
      return _failed(
        'invalid_response',
        FailureCode.invalid,
        uncertain: command.mutation,
      );
    }
  }

  static ClassroomResponse _failed(
    String code,
    FailureCode type, {
    bool uncertain = false,
    Duration? retryAfter,
  }) => ClassroomResponse(
    failure: AppFailure(
      code: type,
      message: 'classroom.error.$code',
      retryAfter: retryAfter,
    ),
    serverCode: code,
    uncertain: uncertain,
  );
}
