import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/storage/app_database.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:geomath_flutter/features/ai_battle/application/ai_battle_controller.dart';
import 'package:geomath_flutter/features/ai_battle/data/ai_battle_repository.dart';
import 'package:geomath_flutter/features/ai_battle/domain/ai_battle_game.dart';
import 'package:geomath_flutter/features/solo/domain/solo_bank.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

final class _Clock implements Clock {
  int value = 0;
  @override
  int monotonicMilliseconds() => value;
  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 6).add(Duration(milliseconds: value));
}

final class _Gate {
  final entered = Completer<void>(), release = Completer<void>();
  void finish() {
    if (!release.isCompleted) release.complete();
  }
}

/// The real SQLite implementation remains responsible for transactions. These
/// controls reproduce delayed commit entry, denied storage and failed reads.
final class _Database implements AppDatabase {
  _Database(this.delegate);
  final AppDatabase delegate;
  _Gate? nextWrite;
  final gates = <_Gate>[];
  bool denyWrites = false, denyReads = false;
  int transactions = 0;

  _Gate holdWrite() {
    final gate = _Gate();
    nextWrite = gate;
    gates.add(gate);
    return gate;
  }

  @override
  Future<T> transaction<T>(Future<T> Function(AppTransaction) action) async {
    transactions++;
    final gate = nextWrite;
    nextWrite = null;
    if (gate != null) {
      gate.entered.complete();
      await gate.release.future;
    }
    if (denyWrites) throw StateError('Injected local storage denial');
    return delegate.transaction(action);
  }

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> arguments = const [],
  ]) {
    if (denyReads) return Future.error(StateError('Injected read denial'));
    return delegate.query(sql, arguments);
  }

  @override
  Stream<void> get changes => delegate.changes;
  @override
  Future<void> close() => Future.value();
}

SoloBank _bank() => SoloBank.fromExport(
  jsonDecode(File('assets/contracts/bank15.json').readAsStringSync())
      as Map<String, dynamic>,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  late Directory directory;
  late SqliteAppDatabase db;
  late _Database controlled;
  late SessionController sessions;
  late AppLifecycleController lifecycle;
  late _Clock clock;
  late AiBattleRepository repository;
  late AiBattleController controller;

  AiBattleController connect() => AiBattleController(
    repository: repository,
    sessions: sessions,
    clock: clock,
    playerRandom: DefaultRandomSource(Random(41)),
    aiRandom: DefaultRandomSource(Random(12)),
    lifecycle: lifecycle,
    loadBank: () async => _bank(),
  );

  Future<void> start([AiDifficulty difficulty = AiDifficulty.easy]) async {
    await controller.initialize();
    expect(
      await controller.start(name: 'Controller QA', difficulty: difficulty),
      isTrue,
    );
  }

  Future<void> drain() async {
    await Future<void>.value();
    await repository.drain();
    await Future<void>.value();
  }

  Future<Map<String, dynamic>> row() async {
    final rows = await db.query('SELECT payload FROM ai_battle_slots');
    return jsonDecode(rows.single['payload']! as String)
        as Map<String, dynamic>;
  }

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('geomath-ai-controller-');
    final opened = await SqliteAppDatabase.open(
      path: '${directory.path}/match.sqlite',
      factory: databaseFactoryFfi,
      migrations: aiBattleMigrations(),
    );
    expect(opened.isSuccess, isTrue);
    db = opened.valueOrNull!;
    controlled = _Database(db);
    sessions = SessionController.guest(
      guestId: 'ai-controller-device',
      sessionId: 'launch-one',
    );
    lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    clock = _Clock();
    repository = AiBattleRepository(database: controlled, sessions: sessions);
    controller = connect();
  });

  tearDown(() async {
    for (final gate in controlled.gates) {
      gate.finish();
    }
    controller.dispose();
    await drain();
    lifecycle.dispose();
    await sessions.dispose();
    await db.close();
    await directory.delete(recursive: true);
  });

  test('initial fixed plan is durable before either clock starts', () async {
    await controller.initialize();
    final gate = controlled.holdWrite();
    final starting = controller.start(
      name: 'Initial Save',
      difficulty: AiDifficulty.easy,
    );
    await gate.entered.future;
    expect(controller.busy, isTrue);
    expect(controller.game, isNull);
    clock.value = 90000;
    gate.finish();
    expect(await starting, isTrue);
    final game = controller.game!;
    expect(controller.savedSlot!.game['paused'], isTrue);
    expect(game.paused, isFalse);
    controller.tick();
    expect(game.aiAnswers, isEmpty);
    expect(game.player.time(clock.value), 0);
    clock.value += game.currentPlan.answerDelayMs - 1;
    controller.tick();
    expect(game.aiAnswers, isEmpty);
    clock.value++;
    controller.tick();
    expect(game.aiAnswers, hasLength(1));
    await drain();
    expect((await row())['game']['ai_answers'], hasLength(1));
  });

  test('background pauses both R2 and AI until explicit resume', () async {
    await start();
    final game = controller.game!,
        plan = jsonEncode(controller.game!.currentPlan.toJson());
    clock.value = 500;
    controller.choose(game.player.question.shape);
    expect(controller.scan('r1')['type'], 'solid');
    await drain();
    lifecycle.setPhase(AppLifecyclePhase.background);
    await drain();
    expect(game.paused, isTrue);
    final paused = jsonEncode(game.checkpoint(clock.value));
    clock.value += 90000;
    lifecycle.setPhase(AppLifecyclePhase.foreground);
    controller.tick();
    expect(game.paused, isTrue);
    expect(jsonEncode(game.checkpoint(clock.value)), paused);
    expect(game.player.stage, GeometryCardKind.net);
    expect(game.player.score, 0);
    expect(game.aiAnswers, isEmpty);
    controller.resume();
    expect(jsonEncode(game.currentPlan.toJson()), plan);
    clock.value += game.currentPlan.answerDelayMs - 500;
    controller.tick();
    expect(game.aiAnswers, hasLength(1));
    controller.choose(game.player.question.shape);
    expect(controller.scan('r2')['type'], 'correct');
    expect(game.player.score, 1);
    expect(controller.continueQuestion(), isFalse);
    clock.value += 900;
    expect(controller.continueQuestion(), isTrue);
    expect(game.index, 1);
    expect(game.currentPlan.accuracy, greaterThan(.4));
    await drain();
    expect(await db.query('SELECT * FROM ${FormativeSchema.outbox}'), isEmpty);
    expect(
      await db.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
      isEmpty,
    );
  });

  test(
    'storage failure is visible and blocks exit until a durable retry',
    () async {
      await start();
      final game = controller.game!;
      controlled.denyWrites = true;
      controller.choose(game.player.question.shape);
      controller.scan('r1');
      await drain();
      expect(controller.saved, isFalse);
      expect(controller.failure?.code, FailureCode.storage);
      expect(await controller.leave(), isFalse);
      expect(controller.game, same(game));
      expect(game.paused, isTrue);
      expect(game.player.stage, GeometryCardKind.net);
      controlled.denyWrites = false;
      expect(await controller.leave(), isTrue);
      expect(controller.game, isNull);
      expect(controller.saved, isTrue);
      expect(controller.savedSlot, isNotNull);
      expect(await controller.resumeSaved(), isTrue);
      expect(controller.game!.player.stage, GeometryCardKind.net);
    },
  );

  test(
    'actor switch while initial save is pending cannot adopt the match',
    () async {
      await controller.initialize();
      final gate = controlled.holdWrite();
      final starting = controller.start(
        name: 'Guest Match',
        difficulty: AiDifficulty.hard,
      );
      await gate.entered.future;
      sessions.bindUser(userId: 'owner-b', sessionId: 'owner-b-session');
      expect(controller.game, isNull);
      expect(controller.savedSlot, isNull);
      gate.finish();
      expect(await starting, isFalse);
      await drain();
      await controller.initialize();
      expect(controller.actor.partition, 'owner:owner-b');
      expect(controller.game, isNull);
      expect(await db.query('SELECT * FROM ai_battle_slots'), isEmpty);
      expect(
        await controller.start(
          name: 'Owner B',
          difficulty: AiDifficulty.medium,
        ),
        isTrue,
      );
      expect((await row())['partition'], 'owner:owner-b');
    },
  );

  test(
    'old commit acknowledgement cannot mark newer R2 progress saved',
    () async {
      await start();
      final first = controlled.holdWrite();
      controller.choose(controller.game!.player.question.shape);
      await first.entered.future;
      final second = controlled.holdWrite();
      expect(controller.scan('r1')['type'], 'solid');
      first.finish();
      await second.entered.future;
      expect(controller.saved, isFalse);
      expect(controller.game!.player.stage, GeometryCardKind.net);
      final persisted = (await row())['game'] as Map;
      // The first snapshot was captured before the R1 scan, independently of
      // subsequent mutations to the live match while SQLite was delayed.
      expect(persisted['selected'], isNotNull);
      expect(persisted['player']['state']['stage'], 'solid');
      second.finish();
      await drain();
      expect(controller.saved, isTrue);
      final latest = (await row())['game'] as Map;
      expect(latest['selected'], isNull);
      expect(latest['player']['state']['stage'], 'net');
    },
  );

  test(
    'duplicate leave shares one save and preserves the fixed resume plan',
    () async {
      await start(AiDifficulty.medium);
      clock.value = 1000;
      final plan = jsonEncode(controller.game!.currentPlan.toJson());
      final expectedAge = controller.game!.checkpoint(
        clock.value,
      )['question_age_ms'];
      final gate = controlled.holdWrite();
      final first = controller.leave(), second = controller.leave();
      expect(identical(first, second), isTrue);
      await gate.entered.future;
      clock.value += 60000;
      gate.finish();
      expect(await first, isTrue);
      controller.dispose();
      controller = connect();
      await controller.initialize();
      expect(controller.savedSlot, isNotNull);
      expect(await controller.resumeSaved(), isTrue);
      expect(jsonEncode(controller.game!.currentPlan.toJson()), plan);
      expect(
        controller.game!.checkpoint(clock.value)['question_age_ms'],
        expectedAge,
      );
      expect(controller.game!.aiAnswers, isEmpty);
    },
  );

  test(
    'invalid domain checkpoint remains stored until explicit replacement',
    () async {
      final actor = sessions.current;
      expect(
        (await repository.save(
          actor,
          AiBattleSlot(
            id: 'ai:corrupt-domain',
            partition: actor.partition,
            game: {'not_a_match': true},
          ),
          create: true,
        )).isSuccess,
        isTrue,
      );
      await controller.initialize();
      expect(await controller.resumeSaved(), isFalse);
      expect(controller.failure?.message, 'ai_battle.invalidSave');
      expect((await row())['game'], {'not_a_match': true});
      expect(
        await controller.start(
          name: 'Replacement',
          difficulty: AiDifficulty.easy,
        ),
        isFalse,
      );
      expect(controller.failure?.code, FailureCode.conflict);
      expect(
        await controller.start(
          name: 'Replacement',
          difficulty: AiDifficulty.easy,
          replaceConfirmed: true,
        ),
        isTrue,
      );
    },
  );

  for (final stage in GeometryCardKind.values) {
    test(
      'durable selected ${stage.name} resumes without consuming a scan',
      () async {
        await start(AiDifficulty.hard);
        final game = controller.game!, answer = game.player.question.shape;
        if (stage == GeometryCardKind.net) {
          controller.choose(answer);
          expect(controller.scan('r1')['type'], 'solid');
        }
        controller.choose(answer);
        expect(game.player.score, 0);
        expect(await controller.leave(), isTrue);
        expect(controller.savedSlot!.game['selected'], answer.name);
        clock.value += 60000;
        expect(await controller.resumeSaved(), isTrue);
        expect(controller.game!.selected, answer);
        expect(controller.game!.player.stage, stage);
        expect(controller.game!.aiAnswers, isEmpty);
        expect(controller.game!.player.score, 0);
        expect(
          controller.scan(
            stage == GeometryCardKind.solid ? 'r1' : 'r2',
          )['type'],
          stage == GeometryCardKind.solid ? 'solid' : 'correct',
        );
        expect(
          controller.game!.player.score,
          stage == GeometryCardKind.solid ? 0 : 1,
        );
      },
    );
  }

  test(
    'read denial and initial write denial never publish false success',
    () async {
      controlled.denyReads = true;
      await controller.initialize();
      expect(controller.failure?.message, 'ai_battle.loadFailed');
      expect(controller.loading, isFalse);
      controlled.denyReads = false;
      await controller.initialize();
      expect(controller.failure, isNull);
      controlled.denyWrites = true;
      expect(
        await controller.start(
          name: 'Not Durable',
          difficulty: AiDifficulty.easy,
        ),
        isFalse,
      );
      expect(controller.busy, isFalse);
      expect(controller.game, isNull);
      expect(controller.saved, isFalse);
      expect(controller.failure?.message, 'ai_battle.saveFailed');
      expect(await db.query('SELECT * FROM ai_battle_slots'), isEmpty);
    },
  );

  test(
    'background during initial save requires explicit resume after return',
    () async {
      await controller.initialize();
      final gate = controlled.holdWrite();
      final starting = controller.start(
        name: 'Background During Save',
        difficulty: AiDifficulty.hard,
      );
      await gate.entered.future;
      lifecycle.setPhase(AppLifecyclePhase.background);
      clock.value = 80000;
      lifecycle.setPhase(AppLifecyclePhase.foreground);
      gate.finish();
      expect(await starting, isTrue);
      expect(controller.game!.paused, isTrue);
      controller.tick();
      expect(controller.game!.aiAnswers, isEmpty);
      controller.resume();
      expect(controller.game!.paused, isFalse);
    },
  );

  test(
    'finished match is saved separately and next match resets adaptation',
    () async {
      await start();
      while (controller.game!.status != AiBattleStatus.finished) {
        final game = controller.game!, answer = game.player.question.shape;
        controller.choose(answer);
        controller.scan('r1');
        controller.choose(answer);
        controller.scan('r2');
        clock.value += game.currentPlan.answerDelayMs;
        controller.tick();
        clock.value += 900;
        expect(controller.continueQuestion(), isTrue);
      }
      expect(controller.game!.player.score, 10);
      expect(controller.game!.currentPlan.accuracy, .65);
      await drain();
      expect(controller.saved, isTrue);
      expect(
        await db.query('SELECT * FROM ${FormativeSchema.outbox}'),
        isEmpty,
      );
      expect(
        await db.query('SELECT * FROM ${FormativeSchema.completedSolo}'),
        isEmpty,
      );
      controller.newMatch();
      expect(controller.game, isNull);
      expect(controller.savedSlot, isNotNull);
      expect(
        await controller.start(
          name: 'New Adaptive Match',
          difficulty: AiDifficulty.easy,
          replaceConfirmed: true,
        ),
        isTrue,
      );
      expect(controller.game!.player.score, 0);
      expect(controller.game!.currentPlan.accuracy, .4);
    },
  );
}
