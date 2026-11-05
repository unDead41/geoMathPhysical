import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'support/cloud_game_test_support.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  test('combined production writer rolls back a real SQLite outbox failure and survives reopen', () async {
    final directory = await Directory.systemTemp.createTemp(
      'geomath-cloud-qa-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final path = '${directory.path}/cloud-game.sqlite';
    final guestStore = TestGuestStore();
    var app = await bootstrapCloudGameForTest(
      databasePath: path,
      guestStore: guestStore,
    );
    addTearDown(() => app.dispose());
    // Test identity only: binding an actor does not simulate server Auth/role.
    app.sessions.bindUser(userId: cloudGameOwnerA, sessionId: 'qa-session-a');
    final actor = app.sessions.current;
    final writer = app.composition.services.get(
      FoundationServices.recordsWriter,
    );
    final record = completedSoloFixture('qa:atomic:1');

    await app.database.transaction(
      (transaction) => transaction.execute(
        'CREATE TRIGGER qa_reject_formative_append '
        'BEFORE INSERT ON ${FormativeSchema.outbox} '
        "BEGIN SELECT RAISE(ABORT, 'QA injected outbox storage failure'); END",
      ),
    );
    final failed = await writer.saveCompletedSolo(actor: actor, record: record);
    expect(failed.failureOrNull?.code, FailureCode.storage);
    expect(failed.valueOrNull, isNull);
    expect(
      await app.database.query(
        'SELECT * FROM ${FormativeSchema.completedSolo}',
      ),
      isEmpty,
    );
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      isEmpty,
    );
    expect(
      await app.database.query('SELECT * FROM sync_solo_receipts'),
      isEmpty,
    );

    await app.database.transaction(
      (transaction) =>
          transaction.execute('DROP TRIGGER qa_reject_formative_append'),
    );
    final saved = await writer.saveCompletedSolo(actor: actor, record: record);
    expect(saved.valueOrNull?.durable, isTrue);
    expect(saved.valueOrNull?.state, FormativeSaveState.pending);
    expect(
      (await writer.saveCompletedSolo(actor: actor, record: record)).isSuccess,
      isTrue,
    );
    expect(
      await app.database.query(
        'SELECT * FROM ${FormativeSchema.completedSolo}',
      ),
      hasLength(1),
    );
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      hasLength(1),
    );
    expect(
      await app.database.query('SELECT * FROM sync_solo_receipts'),
      hasLength(1),
    );

    await app.dispose();
    app = await bootstrapCloudGameForTest(
      databasePath: path,
      guestStore: guestStore,
    );
    final reader = app.composition.services.get(
      FoundationServices.recordsReader,
    );
    expect(app.sessions.current.isGuest, isTrue);
    expect(
      (await reader.readCompletedSolo(app.sessions.current)).valueOrNull,
      isEmpty,
    );
    app.sessions.bindUser(
      userId: cloudGameOwnerA,
      sessionId: 'qa-session-a-reopened',
    );
    expect((await reader.readCompletedSolo(app.sessions.current)).valueOrNull, [
      record,
    ]);
    final pending = await app.database.query(
      'SELECT partition, owner_id FROM ${FormativeSchema.outbox}',
    );
    expect(pending, [
      {'partition': 'owner:$cloudGameOwnerA', 'owner_id': cloudGameOwnerA},
    ]);
  });

  test('combined repositories keep guest, A, B and stale work in their own partitions', () async {
    final app = await bootstrapCloudGameForTest();
    addTearDown(app.dispose);
    final services = app.composition.services;
    final writer = services.get(FoundationServices.recordsWriter);
    final reader = services.get(FoundationServices.recordsReader);
    final guest = app.sessions.current;
    final guestRecord = completedSoloFixture('qa:guest:1');
    final guestSaved = await writer.saveCompletedSolo(
      actor: guest,
      record: guestRecord,
    );
    expect(guestSaved.valueOrNull?.state, FormativeSaveState.local);
    expect(
      await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
      isEmpty,
    );

    app.sessions.bindUser(userId: cloudGameOwnerA, sessionId: 'qa-a');
    final actorA = app.sessions.current;
    final accountRecord = completedSoloFixture('qa:account-a:1');
    expect(
      (await writer.saveCompletedSolo(
        actor: actorA,
        record: accountRecord,
      )).isSuccess,
      isTrue,
    );
    app.sessions.bindUser(userId: cloudGameOwnerB, sessionId: 'qa-b');
    expect(
      (await reader.readCompletedSolo(app.sessions.current)).valueOrNull,
      isEmpty,
    );
    expect(
      (await reader.readCompletedSolo(actorA)).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(
      (await writer.saveCompletedSolo(
        actor: actorA,
        record: completedSoloFixture('qa:late-a:1'),
      )).failureOrNull?.code,
      FailureCode.stale,
    );
    final pending = await app.database.query(
      'SELECT partition, owner_id FROM ${FormativeSchema.outbox}',
    );
    expect(pending, [
      {'partition': actorA.partition, 'owner_id': cloudGameOwnerA},
    ]);

    app.sessions.logout();
    expect(app.sessions.current.partition, guest.partition);
    expect((await reader.readCompletedSolo(app.sessions.current)).valueOrNull, [
      guestRecord,
    ]);
    expect(
      (await reader.readCompletedSolo(actorA)).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(
      await app.database.query(
        'SELECT * FROM ${FormativeSchema.completedSolo}',
      ),
      hasLength(2),
    );
  });
}
