import 'dart:async';

import 'package:sqflite/sqflite.dart' as sqflite;
import 'package:sqflite_common/sqlite_api.dart' as sqlite;

import '../result.dart';
import 'app_database.dart';
import 'formative_schema.dart';
import 'migration.dart';

final class SqliteAppDatabase implements AppDatabase {
  SqliteAppDatabase._(this._database);

  final sqlite.Database _database;
  final StreamController<void> _changes = StreamController<void>.broadcast(
    sync: true,
  );
  bool _closed = false;

  /// [factory] supports real SQLite FFI tests; production uses Android sqflite.
  /// Shared formative schema is always installed exactly once by this owner.
  static Future<Result<SqliteAppDatabase>> open({
    String? path,
    sqlite.DatabaseFactory? factory,
    Iterable<MigrationContribution> migrations = const [],
  }) async {
    sqlite.Database? database;
    try {
      final featureMigrations = migrations.toList();
      if (featureMigrations.any(
        (entry) => entry.namespace == FormativeSchema.namespace,
      )) {
        throw ArgumentError('The shared records namespace is reserved.');
      }
      final registry = MigrationRegistry([
        FormativeSchema.migration,
        ...featureMigrations,
      ]);
      final ordered = [
        FormativeSchema.migration,
        ...registry.contributions.where(
          (entry) => entry.namespace != FormativeSchema.namespace,
        ),
      ];
      final selectedFactory = factory ?? sqflite.databaseFactory;
      final databasePath =
          path ?? '${await selectedFactory.getDatabasesPath()}/geomath.sqlite';
      database = await selectedFactory.openDatabase(
        databasePath,
        options: sqlite.OpenDatabaseOptions(
          singleInstance: false,
          onConfigure: (database) async {
            await database.execute('PRAGMA foreign_keys = ON');
            await database.execute('PRAGMA synchronous = FULL');
          },
        ),
      );
      await database.transaction((transaction) async {
        await transaction.execute('''
          CREATE TABLE IF NOT EXISTS foundation_migrations (
            namespace TEXT NOT NULL,
            version INTEGER NOT NULL,
            description TEXT NOT NULL,
            PRIMARY KEY(namespace, version)
          )
        ''');
        final applied = await transaction.query('foundation_migrations');
        final known = {
          for (final row in applied)
            '${row['namespace']}:${row['version']}': row['description'],
        };
        final handle = _SqliteTransaction(transaction);
        try {
          for (final contribution in ordered) {
            if (known.containsKey(contribution.id)) {
              if (known[contribution.id] != contribution.description) {
                throw StateError('An applied migration identity was modified.');
              }
              continue;
            }
            await contribution.migrate(handle);
            await transaction.insert('foundation_migrations', {
              'namespace': contribution.namespace,
              'version': contribution.version,
              'description': contribution.description,
            });
          }
        } finally {
          handle.invalidate();
        }
      });
      return Success(SqliteAppDatabase._(database));
    } on ArgumentError {
      await database?.close();
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'Database migration contributions are invalid or collide.',
        ),
      );
    } catch (_) {
      await database?.close();
      return const Failed(
        AppFailure(
          code: FailureCode.storage,
          message: 'Local database could not be opened or migrated.',
        ),
      );
    }
  }

  @override
  Stream<void> get changes => _changes.stream;

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) async {
    _ensureOpen();
    return _database.rawQuery(sql, arguments);
  }

  @override
  Future<T> transaction<T>(
    Future<T> Function(AppTransaction transaction) action,
  ) async {
    _ensureOpen();
    final value = await _database.transaction((transaction) async {
      final handle = _SqliteTransaction(transaction);
      try {
        return await action(handle);
      } finally {
        handle.invalidate();
      }
    });
    if (!_closed) _changes.add(null);
    return value;
  }

  void _ensureOpen() {
    if (_closed) throw StateError('Local database is closed.');
  }

  @override
  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    await _database.close();
    await _changes.close();
  }
}

final class _SqliteTransaction implements AppTransaction {
  _SqliteTransaction(this._transaction);

  final sqlite.Transaction _transaction;
  bool _active = true;

  void invalidate() => _active = false;

  void _ensureActive() {
    if (!_active) {
      throw StateError('Transaction callback has already completed.');
    }
  }

  @override
  Future<void> execute(String sql, [List<Object?> arguments = const []]) {
    _ensureActive();
    return _transaction.execute(sql, arguments);
  }

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) {
    _ensureActive();
    return _transaction.rawQuery(sql, arguments);
  }

  @override
  Future<int> rawInsert(String sql, [List<Object?> arguments = const []]) {
    _ensureActive();
    return _transaction.rawInsert(sql, arguments);
  }

  @override
  Future<int> rawUpdate(String sql, [List<Object?> arguments = const []]) {
    _ensureActive();
    return _transaction.rawUpdate(sql, arguments);
  }

  @override
  Future<int> rawDelete(String sql, [List<Object?> arguments = const []]) {
    _ensureActive();
    return _transaction.rawDelete(sql, arguments);
  }
}
