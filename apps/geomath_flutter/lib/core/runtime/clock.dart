/// Wall time is for persisted timestamps; monotonic time is for local elapsed.
abstract interface class Clock {
  DateTime now();
  int monotonicMilliseconds();
}

final class SystemClock implements Clock {
  const SystemClock();

  static final Stopwatch _stopwatch = Stopwatch()..start();

  @override
  DateTime now() => DateTime.now().toUtc();

  @override
  int monotonicMilliseconds() => _stopwatch.elapsedMilliseconds;
}
