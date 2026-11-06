import 'dart:async';
import 'dart:convert';

import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/runtime/clock.dart';
import '../../../core/runtime/random_source.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../../core/storage/app_database.dart';
import '../../../core/storage/migration.dart';
import '../domain/solo_bank.dart';
import '../domain/solo_game.dart';

final class SoloSlot {
  const SoloSlot({
    required this.id,
    required this.partition,
    required this.game,
    this.selected,
    this.completedAt,
  });
  final String id, partition;
  final Map<String, dynamic> game;
  final GeometryShape? selected;
  final int? completedAt;
  Map<String, Object?> toJson() => {
    'schema': 1,
    'id': id,
    'partition': partition,
    'game': game,
    'selected': selected?.name,
    'completed_at': completedAt,
  };
}

/// Quiz leaderboard is a projection of finalized detailed answers, independently
/// of the shared formative reader's newest-50 aggregate retention policy.
final class SoloScore {
  const SoloScore({
    required this.id,
    required this.name,
    required this.score,
    required this.mistakes,
    required this.elapsed,
    required this.completedAt,
  });
  final String id, name;
  final int score, mistakes, elapsed, completedAt;
}

List<MigrationContribution> soloMigrations() => [
  MigrationContribution(
    namespace: 'solo',
    version: 1,
    description: 'Owner-partitioned solo checkpoint and answer analysis',
    migrate: (tx) async {
      await tx.execute(
        'CREATE TABLE solo_checkpoints (partition TEXT PRIMARY KEY, payload TEXT NOT NULL)',
      );
      await tx.execute(
        'CREATE TABLE solo_analysis (partition TEXT NOT NULL, attempt_id TEXT NOT NULL, mode TEXT NOT NULL, detail TEXT NOT NULL, completed_at_ms INTEGER NOT NULL, finalized INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (partition, attempt_id))',
      );
    },
  ),
];

final class SoloRepository {
  SoloRepository({
    required this.database,
    required this.sessions,
    required this.writer,
    required this.clock,
  });
  final AppDatabase database;
  final AuthSession sessions;
  final FormativeRecordWriter writer;
  final Clock clock;
  Future<void> _writes = Future.value();
  Future<void> drain() => _writes;
  static const stale = AppFailure(
    code: FailureCode.stale,
    message: 'The player session changed.',
  );
  static const storage = AppFailure(
    code: FailureCode.storage,
    message: 'Solo progress could not be saved.',
  );
  static const invalid = AppFailure(
    code: FailureCode.invalid,
    message: 'Saved solo progress is damaged or incompatible.',
  );
  void _current(ActorBinding actor) {
    if (!sessions.isCurrent(actor)) throw const _SoloFailure(stale);
  }

  Future<Result<T>> _guard<T>(
    ActorBinding actor,
    Future<T> Function() action,
  ) async {
    try {
      _current(actor);
      final value = await action();
      _current(actor);
      return Success(value);
    } on _SoloFailure catch (error) {
      return Failed(error.failure);
    } on FormatException {
      return const Failed(invalid);
    } catch (_) {
      return const Failed(storage);
    }
  }

  Future<Result<T>> _ordered<T>(
    ActorBinding actor,
    Future<T> Function() action,
  ) {
    final result = Completer<Result<T>>();
    _writes = _writes.then((_) async {
      result.complete(await _guard(actor, action));
    });
    return result.future;
  }

  /// Presence only; the resume screen still validates the full bank/ruleset.
  /// Home can offer a review without loading or mutating the game controller.
  Future<Result<bool>> hasLocalSlot(ActorBinding actor) =>
      _guard(actor, () async {
        final rows = await database.query(
          'SELECT 1 FROM solo_checkpoints WHERE partition = ? LIMIT 1',
          [actor.partition],
        );
        return rows.isNotEmpty;
      });

  Future<Result<SoloSlot?>> read(ActorBinding actor, SoloBank bank) =>
      _guard(actor, () async {
        final rows = await database.query(
          'SELECT payload FROM solo_checkpoints WHERE partition = ?',
          [actor.partition],
        );
        _current(actor);
        if (rows.isEmpty) return null;
        try {
          final value = jsonDecode(
            rows.single['payload'] as String,
          ) as Map<String, dynamic>;
          if (value['schema'] != 1 ||
              value['partition'] != actor.partition ||
              value['id'] is! String ||
              !RegExp(r'^[A-Za-z0-9:_.-]{1,120}$')
                  .hasMatch(value['id'] as String)) {
            throw const FormatException();
          }
          final raw = value['game'] as Map<String, dynamic>;
          final game = SoloGame.restore(raw, bank, _ValidationRandom(), 0);
          final selected = value['selected'] == null
              ? null
              : GeometryShape.values.byName(value['selected'] as String);
          if (selected != null && game.status != SoloStatus.running) {
            throw const FormatException();
          }
          final completed = value['completed_at'];
          if (completed != null &&
              (completed is! int ||
                  completed <= 0 ||
                  game.status != SoloStatus.finished)) {
            throw const FormatException();
          }
          return SoloSlot(
            id: value['id'] as String,
            partition: actor.partition,
            game: raw,
            selected: selected,
            completedAt: completed as int?,
          );
        } catch (_) {
          throw const _SoloFailure(invalid);
        }
      });
  Future<Result<void>> save(
    ActorBinding actor,
    SoloSlot slot, {
    bool create = false,
    bool replaceConfirmed = false,
  }) => _ordered(actor, () async {
    if (slot.partition != actor.partition) throw const _SoloFailure(stale);
    await database.transaction((tx) async {
      _current(actor);
      if (create && !replaceConfirmed) {
        final previous = await tx.query(
          'SELECT partition FROM solo_checkpoints WHERE partition = ?',
          [actor.partition],
        );
        _current(actor);
        if (previous.isNotEmpty) {
          throw const _SoloFailure(
            AppFailure(
              code: FailureCode.conflict,
              message: 'Confirm replacing the saved attempt first.',
            ),
          );
        }
      }
      await tx.rawInsert(
        'INSERT OR REPLACE INTO solo_checkpoints (partition, payload) VALUES (?, ?)',
        [actor.partition, jsonEncode(slot.toJson())],
      );
      _current(actor);
    });
  });
  Future<Result<void>> clear(ActorBinding actor) => _ordered(actor, () async {
    await database.transaction((tx) async {
      _current(actor);
      await tx.rawDelete('DELETE FROM solo_checkpoints WHERE partition = ?', [
        actor.partition,
      ]);
      _current(actor);
    });
  });
  Future<Result<DurableRecordReceipt>> finalize(
    ActorBinding actor,
    SoloGame game,
    String id,
    int completedAt,
  ) => _ordered(actor, () async {
    final record = game.completedRecord(id);
    final detail = jsonEncode({
      'bank': game.bank.identity,
      'player': game.player,
      'answers': game.answers.map((a) => a.toJson()).toList(),
      'elapsed_ms': record.elapsedMilliseconds,
    });
    // A prepared answer detail is recoverable but never shown in the scoreboard
    // before the shared writer acknowledges its atomic aggregate/outbox commit.
    final alreadyFinalized = await database.transaction((tx) async {
      _current(actor);
      final rows = await tx.query(
        'SELECT detail, completed_at_ms, mode, finalized FROM solo_analysis WHERE partition = ? AND attempt_id = ?',
        [actor.partition, id],
      );
      _current(actor);
      if (rows.isNotEmpty &&
          (rows.single['detail'] != detail ||
              rows.single['completed_at_ms'] != completedAt ||
              rows.single['mode'] != game.mode.name)) {
        throw const _SoloFailure(
          AppFailure(
            code: FailureCode.conflict,
            message: 'This attempt already has another result.',
          ),
        );
      }
      if (rows.isNotEmpty && rows.single['finalized'] == 1) return true;
      await tx.rawInsert(
        'INSERT OR IGNORE INTO solo_analysis (partition, attempt_id, mode, detail, completed_at_ms, finalized) VALUES (?, ?, ?, ?, ?, 0)',
        [actor.partition, id, game.mode.name, detail, completedAt],
      );
      _current(actor);
      return false;
    });
    // The shared reader retains only the newest 50 quiz aggregates. This durable
    // acknowledgement must also guard older attempts after that retention removes
    // their aggregate, or another save would create another formative event.
    if (alreadyFinalized) {
      return DurableRecordReceipt(
        actor: actor,
        recordId: id,
        persistedAt: DateTime.fromMillisecondsSinceEpoch(
          completedAt,
          isUtc: true,
        ),
        state: actor.isGuest
            ? FormativeSaveState.local
            : FormativeSaveState.pending,
      );
    }
    final saved = await writer.saveCompletedSolo(actor: actor, record: record);
    _current(actor);
    if (saved case Failed<DurableRecordReceipt>(:final failure)) {
      throw _SoloFailure(failure);
    }
    final receipt = saved.valueOrNull!;
    if (receipt.actor != actor || receipt.recordId != id || !receipt.durable) {
      throw const _SoloFailure(stale);
    }
    await database.transaction((tx) async {
      _current(actor);
      await tx.rawUpdate(
        'UPDATE solo_analysis SET finalized = 1 WHERE partition = ? AND attempt_id = ?',
        [actor.partition, id],
      );
      _current(actor);
    });
    return receipt;
  });
  Future<Result<List<SoloScore>>> leaderboard(
    ActorBinding actor,
    SoloBank bank,
  ) => _guard(actor, () async {
    final rows = await database.query(
      'SELECT attempt_id, detail, completed_at_ms FROM solo_analysis WHERE partition = ? AND mode = ? AND finalized = 1',
      [actor.partition, 'quiz'],
    );
    _current(actor);
    final scores = <SoloScore>[];
    for (final row in rows) {
      final detail =
          jsonDecode(row['detail'] as String) as Map<String, dynamic>;
      final answers = (detail['answers'] as List).cast<Map<String, dynamic>>();
      if (detail['bank'] != bank.identity ||
          answers.length != 10 ||
          answers.map((a) => a['id']).toSet().length != 10) {
        throw const FormatException();
      }
      for (final answer in answers) {
        final question = bank.question(answer['id'] as String);
        if (question.shape.name != answer['shape'] ||
            !['correct', 'wrong', 'skipped'].contains(answer['outcome'])) {
          throw const FormatException();
        }
      }
      final elapsed = detail['elapsed_ms'];
      if (elapsed is! int || elapsed < 0 || elapsed > 604800000) {
        throw const FormatException();
      }
      scores.add(
        SoloScore(
          id: row['attempt_id'] as String,
          name: (detail['player'] as Map)['name'] as String,
          score: answers.where((a) => a['outcome'] == 'correct').length,
          mistakes: answers.where((a) => a['outcome'] == 'wrong').length,
          elapsed: elapsed,
          completedAt: row['completed_at_ms'] as int,
        ),
      );
    }
    scores.sort((a, b) {
      var order = b.score.compareTo(a.score);
      if (order == 0) order = a.mistakes.compareTo(b.mistakes);
      if (order == 0) order = a.elapsed.compareTo(b.elapsed);
      if (order == 0) order = a.completedAt.compareTo(b.completedAt);
      return order == 0 ? a.id.compareTo(b.id) : order;
    });
    return List.unmodifiable(scores.take(50));
  });
}

final class _SoloFailure implements Exception {
  const _SoloFailure(this.failure);
  final AppFailure failure;
}

final class _ValidationRandom implements RandomSource {
  @override
  double nextDouble() => .41;
  @override
  int nextInt(int maximum) => (nextDouble() * maximum).floor();
}
