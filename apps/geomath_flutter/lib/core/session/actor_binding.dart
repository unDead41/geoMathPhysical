/// An operation's identity and scope, never its authorization credentials.
final class ActorBinding {
  const ActorBinding({
    required this.userId,
    required this.partition,
    required this.sessionId,
    required this.epoch,
    required this.scope,
  }) : assert(partition != ''),
       assert(sessionId != ''),
       assert(epoch >= 0),
       assert(scope != '');

  final String? userId;
  final String partition;
  final String sessionId;
  final int epoch;
  final String scope;

  bool get isGuest => userId == null;

  @override
  bool operator ==(Object other) =>
      other is ActorBinding &&
      userId == other.userId &&
      partition == other.partition &&
      sessionId == other.sessionId &&
      epoch == other.epoch &&
      scope == other.scope;

  @override
  int get hashCode => Object.hash(userId, partition, sessionId, epoch, scope);
}
