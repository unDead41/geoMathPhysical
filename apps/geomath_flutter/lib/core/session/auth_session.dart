import 'dart:async';

import '../result.dart';
import '../runtime/random_source.dart';
import 'actor_binding.dart';
import 'guest_identity_store.dart';

abstract interface class AuthSession {
  ActorBinding get current;
  Stream<ActorBinding> get bindings;
  bool isCurrent(ActorBinding binding);
}

/// Owns native identity boundaries. Prompt 3 binds validated SDK identities here.
/// Remembered identity is not proof of server authorization.
final class SessionController implements AuthSession {
  SessionController.guest({
    required String guestId,
    required String sessionId,
    String scope = 'app',
    RandomSource? random,
  }) : _guestId = _validIdentity(guestId),
       _random = random ?? SecureRandomSource(),
       _current = ActorBinding(
         userId: null,
         partition: 'guest:${_validIdentity(guestId)}',
         sessionId: _nonEmpty(sessionId),
         epoch: 0,
         scope: _nonEmpty(scope),
       );

  final String _guestId;
  final RandomSource _random;
  final StreamController<ActorBinding> _bindings =
      StreamController<ActorBinding>.broadcast(sync: true);
  ActorBinding _current;
  bool _disposed = false;

  static Future<Result<SessionController>> open({
    GuestIdentityStore? guestStore,
    RandomSource? random,
  }) async {
    final store = guestStore ?? SharedPreferencesGuestIdentityStore();
    final randomSource = random ?? SecureRandomSource();
    final saved = await store.read();
    if (saved case Failed<String?>(:final failure)) return Failed(failure);
    final storedId = (saved as Success<String?>).value;
    if (storedId != null &&
        !RegExp(r'^[A-Za-z0-9_.-]{1,160}$').hasMatch(storedId)) {
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Stored guest identity is invalid; recovery is required.',
        ),
      );
    }
    final guestId = storedId ?? randomIdentifier(randomSource);
    if (storedId == null) {
      final written = await store.write(guestId);
      if (written case Failed<void>(:final failure)) return Failed(failure);
    }
    return Success(
      SessionController.guest(
        guestId: guestId,
        sessionId: randomIdentifier(randomSource),
        random: randomSource,
      ),
    );
  }

  static String _validIdentity(String value) {
    if (!RegExp(r'^[A-Za-z0-9_.-]{1,160}$').hasMatch(value)) {
      throw ArgumentError('Invalid guest identity.');
    }
    return value;
  }

  static String _nonEmpty(String value) {
    if (value.trim().isEmpty) throw ArgumentError('Identity field is empty.');
    return value;
  }

  @override
  ActorBinding get current => _current;

  @override
  Stream<ActorBinding> get bindings => _bindings.stream;

  @override
  bool isCurrent(ActorBinding binding) => !_disposed && binding == _current;

  /// Rebinding a refreshed token with unchanged user/session/scope preserves epoch.
  void bindUser({
    required String userId,
    required String sessionId,
    String scope = 'app',
  }) {
    _ensureOpen();
    _nonEmpty(userId);
    _nonEmpty(sessionId);
    _nonEmpty(scope);
    if (_current.userId == userId &&
        _current.sessionId == sessionId &&
        _current.scope == scope) {
      return;
    }
    _publish(
      ActorBinding(
        userId: userId,
        partition: 'owner:$userId',
        sessionId: sessionId,
        epoch: _current.epoch + 1,
        scope: scope,
      ),
    );
  }

  void logout() {
    _ensureOpen();
    _publish(
      ActorBinding(
        userId: null,
        partition: 'guest:$_guestId',
        sessionId: randomIdentifier(_random),
        epoch: _current.epoch + 1,
        scope: 'app',
      ),
    );
  }

  void changeScope(String scope) {
    _ensureOpen();
    _nonEmpty(scope);
    if (_current.scope == scope) return;
    _publish(
      ActorBinding(
        userId: _current.userId,
        partition: _current.partition,
        sessionId: _current.sessionId,
        epoch: _current.epoch + 1,
        scope: scope,
      ),
    );
  }

  void _publish(ActorBinding binding) {
    _current = binding;
    _bindings.add(binding);
  }

  void _ensureOpen() {
    if (_disposed) throw StateError('Session controller is disposed.');
  }

  Future<void> dispose() async {
    _disposed = true;
    await _bindings.close();
  }
}
