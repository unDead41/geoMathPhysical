import 'dart:async';
import 'dart:convert';

import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../../core/storage/app_database.dart';
import '../../../core/storage/migration.dart';

/// The local AI slot is deliberately separate from quiz scores and sync records.
/// The AI domain owns validation of the opaque game checkpoint itself.
final class AiBattleSlot {
  const AiBattleSlot({
    required this.id,
    required this.partition,
    required this.game,
  });

  final String id;
  final String partition;
  final Map<String, dynamic> game;

  Map<String, Object?> toJson() => {
    'schema': 1,
    'id': id,
    'partition': partition,
    'game': game,
  };
}

List<MigrationContribution> aiBattleMigrations() => [
  MigrationContribution(
    namespace: 'ai_battle',
    version: 1,
    description: 'Owner-partitioned offline AI battle checkpoint',
    migrate: (transaction) => transaction.execute(
      'CREATE TABLE ai_battle_slots '
      '(partition TEXT PRIMARY KEY, payload TEXT NOT NULL '
      'CHECK(length(CAST(payload AS BLOB)) <= '
      '${AiBattleRepository.maxPayloadBytes}))',
    ),
  ),
];

/// One bounded slot per local owner. All operations share a serial queue so a
/// read observes preceding commit acknowledgements and deletion cannot be
/// followed by an older in-flight checkpoint resurrecting the deleted slot.
final class AiBattleRepository {
  AiBattleRepository({required this.database, required this.sessions});

  final AppDatabase database;
  final AuthSession sessions;
  Future<void> _operations = Future.value();

  static const maxPayloadBytes = 256 * 1024;
  static const _maxDepth = 48;
  static const _maxNodes = 12000;
  static final _id = RegExp(r'^[A-Za-z0-9:_.-]{1,120}$');

  static const stale = AppFailure(
    code: FailureCode.stale,
    message: 'ai_battle.stale',
  );
  static const storage = AppFailure(
    code: FailureCode.storage,
    message: 'ai_battle.saveFailed',
  );
  static const invalid = AppFailure(
    code: FailureCode.invalid,
    message: 'ai_battle.invalidSave',
  );
  static const conflict = AppFailure(
    code: FailureCode.conflict,
    message: 'ai_battle.replaceRequired',
  );
  static const _readFailure = AppFailure(
    code: FailureCode.storage,
    message: 'ai_battle.loadFailed',
  );

  Future<void> drain() => _operations;

  void _current(ActorBinding actor) {
    if (!sessions.isCurrent(actor)) throw const _AiBattleFailure(stale);
  }

  Future<Result<T>> _guard<T>(
    ActorBinding actor,
    Future<T> Function() action, {
    AppFailure storageFailure = storage,
  }) async {
    try {
      _current(actor);
      final value = await action();
      _current(actor);
      return Success(value);
    } on _AiBattleFailure catch (error) {
      return Failed(error.failure);
    } on FormatException {
      return const Failed(invalid);
    } catch (_) {
      return Failed(storageFailure);
    }
  }

  Future<Result<T>> _ordered<T>(
    ActorBinding actor,
    Future<T> Function() action, {
    AppFailure storageFailure = storage,
  }) {
    final result = Completer<Result<T>>();
    _operations = _operations.then((_) async {
      result.complete(
        await _guard(actor, action, storageFailure: storageFailure),
      );
    });
    return result.future;
  }

  Future<Result<AiBattleSlot?>> read(ActorBinding actor) =>
      _ordered(actor, () async {
        final rows = await database.query(
          'SELECT payload FROM ai_battle_slots WHERE partition = ?',
          [actor.partition],
        );
        _current(actor);
        if (rows.isEmpty) return null;
        if (rows.length != 1 || rows.single['payload'] is! String) {
          throw const FormatException('Invalid local AI slot.');
        }
        return _decode(rows.single['payload']! as String, actor.partition);
      }, storageFailure: _readFailure);

  Future<Result<void>> save(
    ActorBinding actor,
    AiBattleSlot slot, {
    bool create = false,
    bool replaceConfirmed = false,
  }) {
    // Capture before joining the asynchronous queue. A caller changing its live
    // checkpoint map while an earlier commit is pending cannot alter this write.
    late final String payload;
    try {
      _current(actor);
      if (slot.partition != actor.partition) {
        throw const _AiBattleFailure(stale);
      }
      if (!_id.hasMatch(slot.id)) {
        throw const FormatException('Invalid AI attempt identity.');
      }
      _validateJson(slot.game);
      payload = jsonEncode(slot.toJson());
      if (utf8.encode(payload).length > maxPayloadBytes) {
        throw const FormatException('Local AI slot is too large.');
      }
    } on _AiBattleFailure catch (error) {
      return Future.value(Failed(error.failure));
    } catch (_) {
      return Future.value(const Failed(invalid));
    }
    return _ordered(actor, () async {
      await database.transaction((transaction) async {
        _current(actor);
        final rows = await transaction.query(
          'SELECT payload FROM ai_battle_slots WHERE partition = ?',
          [actor.partition],
        );
        _current(actor);
        if (create) {
          if (rows.isNotEmpty && !replaceConfirmed) {
            throw const _AiBattleFailure(conflict);
          }
          // Explicit replacement also recovers a corrupt slot. Ordinary
          // checkpoint writes must never silently replace an unknown attempt.
          await transaction.rawInsert(
            'INSERT OR REPLACE INTO ai_battle_slots '
            '(partition, payload) VALUES (?, ?)',
            [actor.partition, payload],
          );
          _current(actor);
        } else {
          if (rows.length != 1 || rows.single['payload'] is! String) {
            throw const _AiBattleFailure(conflict);
          }
          final previous = _decode(
            rows.single['payload']! as String,
            actor.partition,
          );
          if (previous.id != slot.id) throw const _AiBattleFailure(conflict);
          final count = await transaction.rawUpdate(
            'UPDATE ai_battle_slots SET payload = ? WHERE partition = ?',
            [payload, actor.partition],
          );
          _current(actor);
          if (count != 1) throw const _AiBattleFailure(conflict);
        }
      });
    });
  }

  Future<Result<void>> delete(ActorBinding actor) => _ordered(actor, () async {
    await database.transaction((transaction) async {
      _current(actor);
      await transaction.rawDelete(
        'DELETE FROM ai_battle_slots WHERE partition = ?',
        [actor.partition],
      );
      _current(actor);
    });
  });

  static AiBattleSlot _decode(String payload, String partition) {
    if (utf8.encode(payload).length > maxPayloadBytes) {
      throw const FormatException('Local AI slot is too large.');
    }
    final value = jsonDecode(payload);
    if (value is! Map<String, dynamic> ||
        value.length != 4 ||
        value['schema'] is! int ||
        value['schema'] != 1 ||
        value['partition'] != partition ||
        value['id'] is! String ||
        !_id.hasMatch(value['id'] as String) ||
        value['game'] is! Map<String, dynamic>) {
      throw const FormatException('Invalid local AI slot.');
    }
    final game = value['game'] as Map<String, dynamic>;
    _validateJson(game);
    return AiBattleSlot(
      id: value['id'] as String,
      partition: partition,
      game: game,
    );
  }

  static void _validateJson(Object? value) {
    var nodes = 0;
    final ancestors = Set<Object>.identity();
    void visit(Object? item, int depth) {
      if (++nodes > _maxNodes || depth > _maxDepth) {
        throw const FormatException('Local AI checkpoint is too complex.');
      }
      if (item == null || item is bool) return;
      if (item is num) {
        if (!item.isFinite) throw const FormatException('Non-finite value.');
        return;
      }
      if (item is String) {
        if (item.length > maxPayloadBytes) {
          throw const FormatException('Local AI value is too large.');
        }
        return;
      }
      if (item is! Map && item is! List) {
        throw const FormatException('Local AI checkpoint is not JSON.');
      }
      if (!ancestors.add(item)) {
        throw const FormatException('Local AI checkpoint contains a cycle.');
      }
      if (item is Map) {
        for (final entry in item.entries) {
          if (entry.key is! String) {
            throw const FormatException('Local AI key is not text.');
          }
          visit(entry.key, depth + 1);
          visit(entry.value, depth + 1);
        }
      } else {
        for (final entry in item as List) {
          visit(entry, depth + 1);
        }
      }
      ancestors.remove(item);
    }

    visit(value, 0);
  }
}

final class _AiBattleFailure implements Exception {
  const _AiBattleFailure(this.failure);
  final AppFailure failure;
}
