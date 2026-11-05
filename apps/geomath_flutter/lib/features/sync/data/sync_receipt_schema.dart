import 'dart:convert';

import '../../../core/records/formative_records.dart';
import '../../../core/storage/formative_schema.dart';
import '../../../core/storage/migration.dart';

/// Immutable finalization evidence, independent of the bounded quiz view.
/// Record bodies remain foundation-owned; this table cannot be read as history.
abstract final class SyncReceiptSchema {
  static const soloReceipts = 'sync_solo_receipts';
  static final migration = MigrationContribution(
    namespace: 'sync',
    version: 1,
    description: 'Preserve signed-in solo finalization receipts',
    migrate: (tx) async {
      await tx.execute('''
        CREATE TABLE $soloReceipts (
          partition TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          attempt_id TEXT NOT NULL,
          content_version INTEGER NOT NULL CHECK(content_version = 1),
          payload TEXT NOT NULL,
          event_id TEXT,
          persisted_at_ms INTEGER NOT NULL,
          PRIMARY KEY(partition, attempt_id),
          CHECK(partition = 'owner:' || owner_id)
        )
      ''');
      // Upgrade existing durable owner rows, including queued attempts already
      // removed from foundation's 50-quiz view. No guest partition is imported.
      final rows = await tx.query('''
        SELECT partition, payload, created_at_ms, NULL AS event_id
          FROM ${FormativeSchema.completedSolo} WHERE partition LIKE 'owner:%'
        UNION ALL
        SELECT partition, payload, created_at_ms, event_id
          FROM ${FormativeSchema.outbox} WHERE kind = 'solo'
        ORDER BY created_at_ms, event_id
      ''');
      for (final row in rows) {
        final partition = row['partition']! as String;
        final payload =
            jsonDecode(row['payload']! as String) as Map<String, dynamic>;
        final event = FormativeEvent(
          id: 'receipt-upgrade',
          kind: FormativeEventKind.solo,
          payload: payload,
        );
        final body = jsonEncode(event.payload);
        final previous = await tx.query(
          'SELECT payload FROM $soloReceipts WHERE partition = ? AND attempt_id = ?',
          [partition, event.payload['attempt_id']],
        );
        if (previous.isNotEmpty && previous.single['payload'] != body) {
          throw StateError('Conflicting durable solo receipt.');
        }
        if (previous.isNotEmpty) continue;
        await tx.rawInsert(
          'INSERT INTO $soloReceipts '
          '(partition, owner_id, attempt_id, content_version, payload, event_id, persisted_at_ms) '
          'VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            partition,
            partition.substring(6),
            event.payload['attempt_id'],
            event.contentVersion,
            body,
            row['event_id'],
            row['created_at_ms'],
          ],
        );
      }
    },
  );
}
