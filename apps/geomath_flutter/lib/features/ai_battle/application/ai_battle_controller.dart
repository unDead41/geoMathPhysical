import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../../core/geometry/geometry_card_provider.dart';
import '../../../core/lifecycle/app_lifecycle.dart';
import '../../../core/result.dart';
import '../../../core/runtime/clock.dart';
import '../../../core/runtime/random_source.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../solo/domain/solo_bank.dart';
import '../data/ai_battle_repository.dart';
import '../domain/ai_battle_game.dart';

/// Owns a local AI match and its actor-bound durable slot.
///
/// This owner never writes Solo scores, formative outbox rows or live Duel
/// commands. The AI and player clocks are both controlled by the domain match.
final class AiBattleController extends ChangeNotifier {
  AiBattleController({
    required this.repository,
    required this.sessions,
    required this.clock,
    required this.playerRandom,
    required this.aiRandom,
    required this.lifecycle,
    this.loadBank = SoloBank.load,
  }) {
    _binding = sessions.current;
    _bindings = sessions.bindings.listen(_actorChanged);
    lifecycle.addListener(_lifecycleChanged);
  }

  final AiBattleRepository repository;
  final AuthSession sessions;
  final Clock clock;
  final RandomSource playerRandom;
  final RandomSource aiRandom;
  final AppLifecycleController lifecycle;
  final Future<SoloBank> Function() loadBank;

  SoloBank? bank;
  AiBattleGame? game;
  AiBattleSlot? savedSlot;
  String? attemptId;
  AppFailure? failure;
  bool busy = false, loading = false, saved = false;

  late ActorBinding _binding;
  late final StreamSubscription<ActorBinding> _bindings;
  Future<void>? _initializing;
  ActorBinding? _initializingActor;
  Future<bool>? _leaving;
  bool _disposed = false;
  int _operation = 0, _gameGeneration = 0, _checkpointRevision = 0;
  int _pauseIntent = 0;

  ActorBinding get actor => _binding;
  int get now => clock.monotonicMilliseconds();

  bool _current(ActorBinding actor) =>
      !_disposed && actor == _binding && sessions.isCurrent(actor);

  bool _currentGame(ActorBinding actor, AiBattleGame active, int generation) =>
      _current(actor) &&
      identical(active, game) &&
      generation == _gameGeneration;

  void _emit() {
    if (!_disposed) notifyListeners();
  }

  static const _invalid = AppFailure(
    code: FailureCode.invalid,
    message: 'ai_battle.invalidSave',
  );
  static const _loadFailed = AppFailure(
    code: FailureCode.unavailable,
    message: 'ai_battle.loadFailed',
  );
  static const _saveFailed = AppFailure(
    code: FailureCode.storage,
    message: 'ai_battle.saveFailed',
  );

  Future<void> initialize() {
    final actor = _binding;
    if (!_current(actor) || game != null || busy) return Future.value();
    if (_initializingActor == actor && _initializing != null) {
      return _initializing!;
    }
    final future = _initializeFor(actor);
    _initializing = future;
    _initializingActor = actor;
    void clear() {
      if (identical(_initializing, future)) {
        _initializing = null;
        _initializingActor = null;
      }
    }

    unawaited(
      future.then(
        (_) => clear(),
        onError: (Object _, StackTrace _) {
          clear();
        },
      ),
    );
    return future;
  }

  Future<void> _initializeFor(ActorBinding actor) async {
    // Contributions may initialize from a route builder. Publish after build.
    await Future<void>.value();
    if (!_current(actor) || game != null || busy) return;
    loading = true;
    failure = null;
    _emit();
    try {
      final loaded = bank ?? await loadBank();
      if (!_current(actor) || game != null || busy) return;
      bank = loaded;
      final result = await repository.read(actor);
      if (!_current(actor) || game != null || busy) return;
      savedSlot = result.valueOrNull;
      saved = result.isSuccess && savedSlot != null;
      failure = result.failureOrNull;
    } catch (_) {
      if (_current(actor) && game == null) failure = _loadFailed;
    } finally {
      if (_current(actor)) {
        loading = false;
        _emit();
      }
    }
  }

  Future<bool> start({
    required String name,
    required AiDifficulty difficulty,
    bool replaceConfirmed = false,
  }) async {
    final actor = _binding;
    if (!_current(actor) ||
        busy ||
        loading ||
        bank == null ||
        !lifecycle.isForeground) {
      return false;
    }
    final clean = name.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (clean.length < 2 || clean.length > 60) {
      failure = const AppFailure(
        code: FailureCode.invalid,
        message: 'ai_battle.nameInvalid',
      );
      _emit();
      return false;
    }
    if ((savedSlot != null || failure?.code == FailureCode.invalid) &&
        !replaceConfirmed) {
      failure = const AppFailure(
        code: FailureCode.conflict,
        message: 'ai_battle.replaceRequired',
      );
      _emit();
      return false;
    }
    // Replacement cannot leave the previous match's timers running behind the
    // initial save. A failed replacement keeps that previous match paused.
    game?.pause(now);
    final operation = ++_operation, pauseIntent = _pauseIntent;
    busy = true;
    failure = null;
    _emit();
    late final AiBattleGame candidate;
    late final String id;
    try {
      candidate = AiBattleGame(
        bank: bank!,
        playerName: clean,
        difficulty: difficulty,
        playerRandom: playerRandom,
        aiRandom: aiRandom,
        now: now,
      );
      candidate.pause(now);
      id = 'ai:${randomIdentifier(playerRandom)}';
    } catch (_) {
      if (_current(actor) && operation == _operation) {
        busy = false;
        failure = _invalid;
        _emit();
      }
      return false;
    }
    final slot = _slot(candidate, actor, id);
    Result<void> result;
    try {
      result = await repository.save(
        actor,
        slot,
        create: true,
        replaceConfirmed: replaceConfirmed,
      );
    } catch (_) {
      result = const Failed(_saveFailed);
    }
    if (!_current(actor) || operation != _operation) return false;
    busy = false;
    if (!result.isSuccess) {
      failure = result.failureOrNull ?? _saveFailed;
      _emit();
      return false;
    }
    _gameGeneration++;
    _checkpointRevision++;
    game = candidate;
    attemptId = id;
    savedSlot = slot;
    saved = true;
    failure = null;
    if (lifecycle.isForeground && pauseIntent == _pauseIntent) {
      candidate.resume(now);
    }
    _emit();
    return true;
  }

  Future<bool> resumeSaved() async {
    final actor = _binding, slot = savedSlot;
    if (!_current(actor) ||
        busy ||
        loading ||
        game != null ||
        bank == null ||
        slot == null) {
      return false;
    }
    if (slot.partition != actor.partition) {
      failure = _invalid;
      _emit();
      return false;
    }
    try {
      final restored = AiBattleGame.restore(
        checkpoint: _copy(slot.game),
        bank: bank!,
        playerRandom: playerRandom,
        now: now,
      );
      if (!_current(actor) || !identical(slot, savedSlot)) return false;
      _gameGeneration++;
      _checkpointRevision++;
      game = restored;
      attemptId = slot.id;
      failure = null;
      saved = true;
      if (lifecycle.isForeground) restored.resume(now);
      _emit();
      return true;
    } catch (_) {
      if (_current(actor)) {
        // Keep the original slot so corrupt content is never silently erased.
        failure = _invalid;
        saved = false;
        _emit();
      }
      return false;
    }
  }

  bool get _interactive =>
      _current(_binding) &&
      !busy &&
      lifecycle.isForeground &&
      game?.canChoose == true;

  void choose(GeometryShape shape) {
    if (!_interactive) return;
    final active = game!, before = game!.selected;
    active.choose(shape);
    if (before != active.selected) _changed();
  }

  Map<String, Object?> scan(String target) {
    if (!_interactive) return {'type': 'blocked'};
    final result = game!.scan(target, now);
    if (const ['solid', 'correct', 'wrong'].contains(result['type'])) {
      _changed();
    }
    return result;
  }

  bool skip() {
    if (!_interactive || game!.skip(now) != true) return false;
    _changed();
    return true;
  }

  bool hint() {
    if (!_interactive || game!.hint() != true) return false;
    _changed();
    return true;
  }

  bool continueQuestion() {
    if (!_current(_binding) || busy || !lifecycle.isForeground) return false;
    if (game?.continueQuestion(now) != true) return false;
    _changed();
    return true;
  }

  void tick() {
    if (!_current(_binding) ||
        busy ||
        !lifecycle.isForeground ||
        game == null ||
        game!.paused ||
        game!.status == AiBattleStatus.finished) {
      return;
    }
    if (game!.tick(now)) {
      _changed();
    } else {
      // Elapsed labels and the review gate update without a write per frame.
      _emit();
    }
  }

  void _changed() {
    saved = false;
    _emit();
    unawaited(checkpoint());
  }

  void _pause({required bool persist}) {
    ++_pauseIntent;
    final active = game;
    if (active == null || active.paused) return;
    active.pause(now);
    saved = false;
    _emit();
    if (persist) unawaited(checkpoint());
  }

  void pause() => _pause(persist: true);

  void resume() {
    final active = game;
    if (!_current(_binding) ||
        busy ||
        active == null ||
        !active.paused ||
        !lifecycle.isForeground ||
        active.status == AiBattleStatus.finished) {
      return;
    }
    active.resume(now);
    _changed();
  }

  static Map<String, dynamic> _copy(Map<String, dynamic> source) =>
      (jsonDecode(jsonEncode(source)) as Map).cast<String, dynamic>();

  AiBattleSlot _slot(AiBattleGame active, ActorBinding actor, String id) =>
      AiBattleSlot(
        id: id,
        partition: actor.partition,
        game: _copy(active.checkpoint(now)),
      );

  Future<bool> checkpoint() async {
    final active = game, actor = _binding, id = attemptId;
    if (active == null || id == null || !_current(actor)) return false;
    final generation = _gameGeneration, revision = ++_checkpointRevision;
    saved = false;
    _emit();
    late final AiBattleSlot slot;
    Result<void> result;
    try {
      // Take immutable data before awaiting a queued SQLite transaction.
      slot = _slot(active, actor, id);
      result = await repository.save(actor, slot);
    } catch (_) {
      result = const Failed(_saveFailed);
    }
    if (!_currentGame(actor, active, generation) || id != attemptId) {
      return false;
    }
    if (revision != _checkpointRevision) return false;
    saved = result.isSuccess;
    if (saved) {
      savedSlot = slot;
      failure = null;
    } else {
      failure = result.failureOrNull ?? _saveFailed;
    }
    _emit();
    return saved;
  }

  Future<bool> leave() {
    if (_disposed) return Future.value(false);
    if (_leaving case final leaving?) return leaving;
    if (busy) {
      _pause(persist: false);
      return Future.value(false);
    }
    final active = game, actor = _binding, generation = _gameGeneration;
    if (active == null) return Future.value(true);
    final future = () async {
      _pause(persist: false);
      if (!await checkpoint() || !_currentGame(actor, active, generation)) {
        return false;
      }
      game = null;
      attemptId = null;
      _gameGeneration++;
      _emit();
      return true;
    }();
    _leaving = future;
    unawaited(
      future.then(
        (_) {
          if (identical(_leaving, future)) _leaving = null;
        },
        onError: (Object _, StackTrace _) {
          if (identical(_leaving, future)) _leaving = null;
        },
      ),
    );
    return future;
  }

  void newMatch() {
    if (!_current(_binding) ||
        busy ||
        !saved ||
        game?.status != AiBattleStatus.finished) {
      return;
    }
    _gameGeneration++;
    _checkpointRevision++;
    game = null;
    attemptId = null;
    failure = null;
    _emit();
  }

  void _lifecycleChanged() {
    if (!lifecycle.isForeground) pause();
  }

  void _actorChanged(ActorBinding actor) {
    if (_disposed || actor == _binding) return;
    game?.pause(now);
    _binding = actor;
    _operation++;
    _gameGeneration++;
    _checkpointRevision++;
    _pauseIntent++;
    game = null;
    attemptId = null;
    savedSlot = null;
    saved = false;
    busy = false;
    loading = false;
    _leaving = null;
    failure = const AppFailure(
      code: FailureCode.stale,
      message: 'ai_battle.stale',
    );
    _emit();
    unawaited(initialize());
  }

  @override
  void dispose() {
    if (_disposed) return;
    game?.pause(now);
    _disposed = true;
    _operation++;
    lifecycle.removeListener(_lifecycleChanged);
    unawaited(_bindings.cancel());
    super.dispose();
  }
}
