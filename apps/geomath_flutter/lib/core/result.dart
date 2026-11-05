/// A recoverable operation outcome. Failures never carry transport credentials.
sealed class Result<T> {
  const Result();

  bool get isSuccess => this is Success<T>;

  T? get valueOrNull => switch (this) {
    Success<T>(:final value) => value,
    Failed<T>() => null,
  };

  AppFailure? get failureOrNull => switch (this) {
    Success<T>() => null,
    Failed<T>(:final failure) => failure,
  };

  Result<R> map<R>(R Function(T value) transform) => switch (this) {
    Success<T>(:final value) => Success(transform(value)),
    Failed<T>(:final failure) => Failed(failure),
  };
}

final class Success<T> extends Result<T> {
  const Success(this.value);

  final T value;
}

final class Failed<T> extends Result<T> {
  const Failed(this.failure);

  final AppFailure failure;
}

enum FailureCode {
  unavailable,
  stale,
  unauthorized,
  conflict,
  storage,
  retryAfter,
  invalid,
  network,
  cancelled,
  unexpected,
}

final class AppFailure {
  const AppFailure({
    required this.code,
    required this.message,
    this.retryAfter,
  });

  final FailureCode code;
  final String message;
  final Duration? retryAfter;

  @override
  bool operator ==(Object other) =>
      other is AppFailure &&
      code == other.code &&
      message == other.message &&
      retryAfter == other.retryAfter;

  @override
  int get hashCode => Object.hash(code, message, retryAfter);
}
