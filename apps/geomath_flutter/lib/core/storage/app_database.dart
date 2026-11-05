/// A transaction handle is valid only until its callback returns. Do not retain
/// it, nest transactions, or call the parent database from inside its callback.
abstract interface class AppTransaction {
  Future<void> execute(String sql, [List<Object?> arguments = const []]);
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]);
  Future<int> rawInsert(String sql, [List<Object?> arguments = const []]);
  Future<int> rawUpdate(String sql, [List<Object?> arguments = const []]);
  Future<int> rawDelete(String sql, [List<Object?> arguments = const []]);
}

abstract interface class AppDatabase {
  /// Any thrown error rolls the transaction back, including record/outbox writes.
  /// Completion means the platform's commit acknowledgment has been received.
  Future<T> transaction<T>(
    Future<T> Function(AppTransaction transaction) action,
  );
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]);
  Stream<void> get changes;
  Future<void> close();
}
