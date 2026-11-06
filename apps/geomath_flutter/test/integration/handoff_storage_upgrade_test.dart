import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/local_formative_records.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:geomath_flutter/features/ai_battle/ai_battle_feature.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_checkpoint_repository.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:geomath_flutter/features/sync/data/sqlite_formative_outbox.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/learning/studio/checkpoint_fixture.dart';

const _owners = <String?>[
  null,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
];

final class _Clock implements Clock {
  int value = 0;
  @override
  int monotonicMilliseconds() => value;
  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 6).add(Duration(milliseconds: value));
}

SoloBank _bank() => SoloBank.fromExport(
  jsonDecode(File('assets/contracts/bank15.json').readAsStringSync())
      as Map<String, dynamic>,
);

SoloGame _solo(SoloBank bank) => SoloGame(
  bank: bank,
  player: const {'name': 'Upgrade QA', 'category': 'Tetamu', 'className': ''},
  random: DefaultRandomSource(Random(41)),
);

SoloGame _completedSolo(SoloBank bank) {
  final game = _solo(bank);
  var now = 0;
  while (game.status != SoloStatus.finished) {
    now += 500;
    game.scan('solid', game.question.shape.name, 'r1', now);
    game.scan('net', game.question.shape.name, 'r2', now);
    now += SoloGame.reviewMs;
    game.reviewing ? game.continueReview(now) : game.update(now);
  }
  return game;
}

/// Host SQLite evidence only: these are the real migration contributions and
/// repositories, without an Android plugin, hosted service or signing operation.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  test('legacy data survives combined migrations, AI completion and repeated reopen', () async {
    final directory = await Directory.systemTemp.createTemp('geomath-upgrade-');
    final path = '${directory.path}/app.sqlite';
    final clock = _Clock();
    final bank = _bank();
    final contributions = productionFeatures();
    final migrations = contributions
        .expand((feature) => feature.migrations)
        .toList();
    // All pre-existing definitions are unchanged in the combined candidate.
    // The legacy app already owns learning, Solo, sync and foundation tables.
    final legacy = migrations.where((entry) => entry.namespace != 'ai_battle');
    SqliteAppDatabase? database;
    SessionController? sessions;
    AiBattleController? activeAi;
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);

    Future<void> open({required bool upgraded}) async {
      final result = await SqliteAppDatabase.open(
        path: path,
        factory: databaseFactoryFfi,
        migrations: upgraded ? migrations : legacy,
      );
      expect(result.isSuccess, isTrue, reason: result.failureOrNull?.message);
      database = result.valueOrNull!;
      sessions = SessionController.guest(
        guestId: 'upgrade-device',
        sessionId: 'launch-${clock.value}',
      );
    }

    void bind(String? owner) {
      if (owner == null) {
        if (!sessions!.current.isGuest) sessions!.logout();
      } else {
        sessions!.bindUser(userId: owner, sessionId: 'session-${clock.value}');
      }
    }

    LocalFormativeRecords records() => LocalFormativeRecords(
      database: database!,
      sessions: sessions!,
      clock: clock,
      outbox: SqliteFormativeOutbox(
        database: database!,
        sessions: sessions!,
        clock: clock,
      ),
    );

    SoloRepository solo(LocalFormativeRecords writer) => SoloRepository(
      database: database!,
      sessions: sessions!,
      writer: writer,
      clock: clock,
    );

    LearningCheckpointRepository checkpoints() => LearningCheckpointRepository(
      database: database!,
      sessions: sessions!,
      clock: clock,
    );

    Future<Map<String, List<Map<String, Object?>>>> snapshot(
      Iterable<String> tables,
    ) async => {
      for (final table in tables)
        table: await database!.query('SELECT * FROM $table ORDER BY rowid'),
    };

    Future<void> close() async {
      activeAi?.dispose();
      activeAi = null;
      await database?.close();
      database = null;
      await sessions?.dispose();
      sessions = null;
      clock.value += 100000;
    }

    try {
      await open(upgraded: false);
      expect(
        (await database!.query(
          'SELECT namespace FROM foundation_migrations ORDER BY namespace',
        )).map((row) => row['namespace']),
        ['foundation_records', 'learning_checkpoints', 'solo', 'sync'],
      );
      final reflection = ModuleReflection.create(
        activity: ModuleActivity.net,
        stage: ReflectionStage.explanation,
        prediction: 'Six physical faces',
        result: 'The net closes into a cube',
        explanation: 'Each face retains its adjacent faces',
        completed: true,
      ).valueOrNull!;
      for (var index = 0; index < _owners.length; index++) {
        bind(_owners[index]);
        final actor = sessions!.current;
        final writer = records();
        final repository = solo(writer);
        final game = _solo(bank);
        game.scan('solid', game.question.shape.name, 'r1', 100);
        game.pause(100);
        expect(
          (await repository.save(
            actor,
            SoloSlot(
              id: 'solo:pending-$index',
              partition: actor.partition,
              game: game.checkpoint(100).cast<String, dynamic>(),
              selected: game.question.shape,
            ),
            create: true,
          )).isSuccess,
          isTrue,
        );
        expect(
          (await repository.finalize(
            actor,
            _completedSolo(bank),
            'solo:complete-$index',
            clock.now().millisecondsSinceEpoch,
          )).valueOrNull?.durable,
          isTrue,
        );
        expect(
          (await writer.saveReflection(
            actor: actor,
            reflection: reflection,
          )).valueOrNull?.durable,
          isTrue,
        );
        expect(
          (await checkpoints().save(
            actor,
            'calculation:cube:default',
            learningCheckpointFixture(),
          )).isSuccess,
          isTrue,
        );
        await repository.drain();
      }
      final tables = (await database!.query(
        "SELECT name FROM sqlite_master WHERE type = 'table' "
        "AND name != 'foundation_migrations' ORDER BY name",
      )).map((row) => row['name']! as String).toList();
      final original = await snapshot(tables);
      final expectedAi = <String, AiBattleSlot>{};
      await close();

      // Two consecutive upgraded launches prove the migration ledger remains
      // idempotent and the original owner data is never copied into AI rows.
      for (var launch = 0; launch < 2; launch++) {
        await open(upgraded: true);
        expect(await snapshot(tables), original);
        expect(
          await database!.query(
            'SELECT namespace, version FROM foundation_migrations '
            'ORDER BY namespace, version',
          ),
          [
            {'namespace': 'ai_battle', 'version': 1},
            {'namespace': 'foundation_records', 'version': 1},
            {'namespace': 'learning_checkpoints', 'version': 1},
            {'namespace': 'solo', 'version': 1},
            {'namespace': 'sync', 'version': 1},
          ],
        );
        for (var index = 0; index < _owners.length; index++) {
          bind(_owners[index]);
          final actor = sessions!.current;
          final writer = records();
          final repository = solo(writer);
          expect((await repository.hasLocalSlot(actor)).valueOrNull, isTrue);
          final slot = (await repository.read(actor, bank)).valueOrNull!;
          expect(slot.id, 'solo:pending-$index');
          expect(
            SoloGame.restore(
              slot.game,
              bank,
              DefaultRandomSource(Random(42)),
              clock.value,
            ).stage,
            GeometryCardKind.net,
          );
          expect(slot.selected, isNotNull);
          expect(
            (await repository.leaderboard(actor, bank)).valueOrNull,
            hasLength(1),
          );
          expect(
            (await writer.readCompletedSolo(actor))
                .valueOrNull
                ?.single
                .attemptId,
            'solo:complete-$index',
          );
          expect((await writer.watchReflections(actor).first).valueOrNull, [
            reflection,
          ]);
          final latest = (await checkpoints().readLatest(actor)).valueOrNull!;
          expect(latest.section, 'calculation');
          expect(latest.payload, learningCheckpointFixture());

          final aiRepository = AiBattleRepository(
            database: database!,
            sessions: sessions!,
          );
          final controller = AiBattleController(
            repository: aiRepository,
            sessions: sessions!,
            clock: clock,
            playerRandom: DefaultRandomSource(Random(31)),
            aiRandom: DefaultRandomSource(Random(62)),
            lifecycle: lifecycle,
            loadBank: () async => bank,
          );
          activeAi = controller;
          await controller.initialize();
          if (launch == 0) {
            expect(controller.savedSlot, isNull);
            expect(
              await controller.start(
                name: 'Upgrade AI',
                difficulty: AiDifficulty.medium,
              ),
              isTrue,
            );
            controller.choose(controller.game!.player.question.shape);
            expect(controller.scan('r1')['type'], 'solid');
            controller.choose(controller.game!.player.question.shape);
            lifecycle.setPhase(AppLifecyclePhase.background);
            expect(await controller.checkpoint(), isTrue);
            await aiRepository.drain();
            final paused = jsonEncode(controller.game!.checkpoint(clock.value));
            clock.value += 90000;
            lifecycle.setPhase(AppLifecyclePhase.foreground);
            controller.tick();
            expect(controller.game!.paused, isTrue);
            expect(
              jsonEncode(controller.game!.checkpoint(clock.value)),
              paused,
            );
            expectedAi[actor.partition] = (await aiRepository.read(actor))
                .valueOrNull!;
          } else {
            final expected = expectedAi[actor.partition]!;
            expect(controller.savedSlot!.id, expected.id);
            expect(controller.savedSlot!.game, expected.game);
            lifecycle.setPhase(AppLifecyclePhase.background);
            expect(await controller.resumeSaved(), isTrue);
            expect(controller.game!.paused, isTrue);
            expect(controller.game!.player.stage, GeometryCardKind.net);
            expect(controller.game!.selected, isNotNull);
            lifecycle.setPhase(AppLifecyclePhase.foreground);
            controller.tick();
            expect(controller.game!.paused, isTrue);
            if (index == 1) {
              controller.resume();
              while (controller.game!.status != AiBattleStatus.finished) {
                final game = controller.game!;
                if (game.player.stage == GeometryCardKind.solid) {
                  controller.choose(game.player.question.shape);
                  expect(controller.scan('r1')['type'], 'solid');
                }
                controller.choose(game.player.question.shape);
                expect(controller.scan('r2')['type'], 'correct');
                clock.value += game.currentPlan.answerDelayMs;
                controller.tick();
                clock.value += SoloGame.reviewMs + 1;
                expect(controller.continueQuestion(), isTrue);
              }
              expect(controller.game!.player.score, 10);
              expect(await controller.checkpoint(), isTrue);
            }
            await aiRepository.drain();
          }
          controller.dispose();
          activeAi = null;
          await aiRepository.drain();
          // AI completion and resume may change its one slot only. Existing
          // Solo results, learning drafts, reflections and outbox stay exact.
          expect(await snapshot(tables), original);
        }
        expect(
          await database!.query('SELECT * FROM ai_battle_slots'),
          hasLength(_owners.length),
        );
        await close();
      }
      await open(upgraded: true);
      bind(_owners[1]);
      final finishedSlot = (await AiBattleRepository(
        database: database!,
        sessions: sessions!,
      ).read(sessions!.current)).valueOrNull!;
      final finishedGame = AiBattleGame.restore(
        checkpoint: finishedSlot.game,
        bank: bank,
        playerRandom: DefaultRandomSource(Random(99)),
        now: clock.value,
      );
      expect(finishedGame.status, AiBattleStatus.finished);
      expect(finishedGame.player.score, 10);
      expect(await snapshot(tables), original);
      expect(
        await database!.query('SELECT * FROM foundation_migrations'),
        hasLength(5),
      );
      expect(
        await database!.query('SELECT * FROM ai_battle_slots'),
        hasLength(_owners.length),
      );
    } finally {
      await close();
      lifecycle.dispose();
      await directory.delete(recursive: true);
    }
  });
}
