import 'migration.dart';

/// Foundation owns these shared tables. Learning and sync use these constants
/// and DTOs; they must not create another reflection schema or reader model.
abstract final class FormativeSchema {
  static const namespace = 'foundation_records';
  static const reflections = 'module_reflections';
  static const completedSolo = 'completed_solo_records';
  static const outbox = 'formative_outbox';
  static const contentVersion = 1;
  static const maxPendingPerOwner = 2000;
  static const maxBatchSize = 20;
  static const maxLocalQuizScores = 50;

  static final migration = MigrationContribution(
    namespace: namespace,
    version: 1,
    description:
        'Actor-partitioned canonical formative records and atomic outbox v1',
    migrate: (transaction) async {
      await transaction.execute('''
        CREATE TABLE module_reflections (
          partition TEXT NOT NULL,
          activity TEXT NOT NULL CHECK(activity IN ('net','volume','area','composite')),
          payload TEXT NOT NULL,
          updated_at_ms INTEGER NOT NULL,
          PRIMARY KEY(partition, activity)
        )
      ''');
      await transaction.execute('''
        CREATE TABLE completed_solo_records (
          partition TEXT NOT NULL,
          attempt_id TEXT NOT NULL,
          mode TEXT NOT NULL CHECK(mode IN ('quiz','practice','review')),
          payload TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          PRIMARY KEY(partition, attempt_id)
        )
      ''');
      await transaction.execute('''
        CREATE INDEX completed_solo_owner_time
        ON completed_solo_records(partition, created_at_ms DESC, attempt_id)
      ''');
      await transaction.execute('''
        CREATE TABLE formative_outbox (
          partition TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          event_id TEXT NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('module','solo')),
          content_version INTEGER NOT NULL CHECK(content_version = 1),
          payload TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          PRIMARY KEY(partition, event_id),
          CHECK(partition = 'owner:' || owner_id)
        )
      ''');
      await transaction.execute('''
        CREATE INDEX formative_outbox_owner_time
        ON formative_outbox(partition, created_at_ms, event_id)
      ''');
    },
  );
}
