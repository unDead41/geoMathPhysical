import 'dart:async';

import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../auth/data/auth_repository.dart';
import 'profile_repository.dart';

final class ProfileDraft {
  const ProfileDraft({
    required this.name,
    required this.username,
    required this.avatar,
    required this.role,
    required this.base,
    required this.unknownOutcome,
  });
  final String name;
  final String username;
  final String avatar;
  final AccountRole role;
  final AccountProfile? base;
  final bool unknownOutcome;
}

/// Feature memory only. Drafts survive tab unmount, never actor/session/scope
/// changes, and never enter records, an outbox, or protected credential storage.
final class ProfileDrafts {
  ProfileDrafts(this.sessions) : _actor = sessions.current {
    _subscription = sessions.bindings.listen((actor) {
      if (actor != _actor) {
        _actor = actor;
        _draft = null;
      }
    });
  }
  final AuthSession sessions;
  ActorBinding _actor;
  ProfileDraft? _draft;
  late final StreamSubscription<ActorBinding> _subscription;
  ProfileDraft? read(ActorBinding actor) =>
      sessions.isCurrent(actor) && actor == _actor ? _draft : null;
  void save(ActorBinding actor, ProfileDraft? draft) {
    if (sessions.isCurrent(actor) && actor == _actor) _draft = draft;
  }

  void dispose() {
    _draft = null;
    unawaited(_subscription.cancel());
  }
}
