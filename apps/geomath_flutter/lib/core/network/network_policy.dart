import 'dart:io';
import 'dart:math' as math;

import '../result.dart';
import '../runtime/clock.dart';
import '../runtime/random_source.dart';
import '../session/actor_binding.dart';
import '../session/auth_session.dart';

/// Transport policy owns no tokens, server clocks, scores, or account caches.
final class NetworkPolicy {
  NetworkPolicy({
    required this._sessions,
    this._clock = const SystemClock(),
    RandomSource? random,
    this.baseRetry = const Duration(milliseconds: 300),
    this.maxRetry = const Duration(seconds: 30),
    this.maxAttempts = 5,
  }) : _random = random ?? DefaultRandomSource() {
    if (baseRetry <= Duration.zero || maxRetry < baseRetry || maxAttempts < 1) {
      throw ArgumentError('Invalid bounded retry policy.');
    }
  }

  final AuthSession _sessions;
  final Clock _clock;
  final RandomSource _random;
  final Duration baseRetry;
  final Duration maxRetry;
  final int maxAttempts;

  /// The request adapter must capture the correct credential synchronously for
  /// [actor] when request starts. Never fetch another actor's token after await.
  Future<Result<T>> guard<T>(
    ActorBinding actor,
    Future<Result<T>> Function() request,
  ) async {
    if (!_sessions.isCurrent(actor)) return const Failed(_stale);
    try {
      final response = await request();
      if (!_sessions.isCurrent(actor)) return const Failed(_stale);
      return response;
    } catch (_) {
      return _sessions.isCurrent(actor)
          ? const Failed(
              AppFailure(
                code: FailureCode.network,
                message: 'Network request failed.',
              ),
            )
          : const Failed(_stale);
    }
  }

  /// Returns null for terminal failures or an exhausted retry budget.
  /// The caller owns cancellation/lifecycle and never queues live actions here.
  Duration? retryDelay(int attempt, AppFailure failure) {
    if (attempt < 0 ||
        attempt >= maxAttempts ||
        !{FailureCode.network, FailureCode.retryAfter}.contains(failure.code)) {
      return null;
    }
    final ceiling = math.min(
      maxRetry.inMilliseconds,
      baseRetry.inMilliseconds * (1 << math.min(attempt, 10)),
    );
    final draw = _random.nextDouble();
    final unit = draw.isFinite ? draw.clamp(0.0, 1.0) : 0.0;
    final jitter = (ceiling * (0.5 + unit * 0.5)).round();
    return Duration(
      milliseconds: math.max(jitter, failure.retryAfter?.inMilliseconds ?? 0),
    );
  }

  /// HTTP Retry-After supports both delay-seconds and an absolute HTTP date.
  Duration? parseRetryAfter(String? header) {
    if (header == null || header.trim().isEmpty) return null;
    final seconds = double.tryParse(header.trim());
    if (seconds != null) {
      if (!seconds.isFinite || seconds < 0 || seconds > 2147483647) return null;
      return Duration(milliseconds: (seconds * 1000).ceil());
    }
    try {
      final delay = HttpDate.parse(header).difference(_clock.now());
      return delay.isNegative ? Duration.zero : delay;
    } catch (_) {
      return null;
    }
  }

  static const _stale = AppFailure(
    code: FailureCode.stale,
    message: 'Response belongs to a previous session or scope.',
  );
}
