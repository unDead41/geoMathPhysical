import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/lifecycle/app_lifecycle.dart';
import '../../core/records/formative_records.dart';
import '../../core/result.dart';
import '../../core/runtime/clock.dart';
import '../../core/runtime/random_source.dart';
import '../../core/session/actor_binding.dart';
import '../../core/session/auth_session.dart';
import 'data/solo_repository.dart';
import 'domain/solo_bank.dart';
import 'domain/solo_game.dart';

/// Owns one active solo instance. All async operations capture the full actor.
final class SoloController extends ChangeNotifier {
  SoloController({
    required this.repository,
    required this.sessions,
    required this.clock,
    required this.random,
    required this.lifecycle,
    this.loadBank = SoloBank.load,
  }) {
    _binding = sessions.current;
    _sessionSubscription = sessions.bindings.listen(_actorChanged);
    lifecycle.addListener(_lifecycleChanged);
  }
  final SoloRepository repository;
  final AuthSession sessions;
  final Clock clock;
  final RandomSource random;
  final AppLifecycleController lifecycle;
  final Future<SoloBank> Function() loadBank;
  late ActorBinding _binding;
  late final StreamSubscription<ActorBinding> _sessionSubscription;
  SoloBank? bank;
  SoloGame? game;
  SoloSlot? savedSlot;
  GeometryShape? selected;
  AppFailure? failure;
  DurableRecordReceipt? receipt;
  String? attemptId;
  int? completedAt;
  bool busy = false, loading = false, saved = false, _disposed = false;
  Future<void>? _finishing;
  SoloGame? _finishingGame;
  ActorBinding? _finishingActor;
  Future<void>? _initializing;
  ActorBinding? _initializingActor;
  int _checkpointGeneration = 0;
  ActorBinding get actor => _binding;
  int get now => clock.monotonicMilliseconds();
  void _emit() {
    if (!_disposed) notifyListeners();
  }

  bool _current(ActorBinding binding) =>
      !_disposed && binding == _binding && sessions.isCurrent(binding);
  Future<void> initialize() {
    final binding = _binding;
    if (!_current(binding) || game != null || busy) return Future.value();
    if (_initializingActor == binding && _initializing != null) {
      return _initializing!;
    }
    final future = _initializeFor(binding);
    _initializingActor = binding;
    _initializing = future;
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

  Future<void> _initializeFor(ActorBinding binding) async {
    // A route builder may request this owner while another route still listens.
    // Publish loading after the caller's synchronous build has completed.
    await Future<void>.value();
    if (!_current(binding) || game != null || busy) return;
    loading = true;
    failure = null;
    _emit();
    try {
      final loaded = bank ?? await loadBank();
      if (!_current(binding) || game != null) return;
      bank = loaded;
      final result = await repository.read(binding, loaded);
      if (!_current(binding) || game != null) return;
      savedSlot = result.valueOrNull;
      failure = result.failureOrNull;
    } catch (_) {
      if (_current(binding)) {
        failure = const AppFailure(
          code: FailureCode.unavailable,
          message: 'Canonical solo content is unavailable.',
        );
      }
    } finally {
      if (_current(binding)) {
        loading = false;
        _emit();
      }
    }
  }

  Future<bool> start({
    required String name,
    SoloMode mode = SoloMode.quiz,
    List<String>? questionIds,
    bool replaceConfirmed = false,
  }) async {
    if (busy || loading || bank == null) return false;
    final clean = name.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (clean.length < 2 || clean.length > 60) {
      failure = const AppFailure(
        code: FailureCode.invalid,
        message: 'Use a name with 2–60 characters.',
      );
      _emit();
      return false;
    }
    if ((savedSlot != null || failure?.code == FailureCode.invalid) &&
        !replaceConfirmed) {
      failure = const AppFailure(
        code: FailureCode.conflict,
        message: 'Confirm replacing the saved attempt first.',
      );
      _emit();
      return false;
    }
    final binding = _binding;
    busy = true;
    failure = null;
    _emit();
    late final SoloGame candidate;
    try {
      candidate = SoloGame(
        bank: bank!,
        player: {'name': clean, 'category': 'Tetamu', 'className': ''},
        random: random,
        mode: mode,
        questionIds: questionIds,
        now: now,
      );
    } catch (_) {
      busy = false;
      failure = SoloRepository.invalid;
      _emit();
      return false;
    }
    candidate.pause(now);
    final id = 'solo:${randomIdentifier(random)}';
    final slot = SoloSlot(
      id: id,
      partition: binding.partition,
      game: candidate.checkpoint(now).cast<String, dynamic>(),
    );
    final result = await repository.save(
      binding,
      slot,
      create: true,
      replaceConfirmed: replaceConfirmed,
    );
    if (!_current(binding)) return false;
    busy = false;
    if (!result.isSuccess) {
      failure = result.failureOrNull;
      _emit();
      return false;
    }
    game = candidate;
    selected = null;
    attemptId = id;
    completedAt = null;
    receipt = null;
    savedSlot = slot;
    saved = true;
    if (lifecycle.isForeground) candidate.resume(now);
    _emit();
    return true;
  }

  Future<bool> resumeSaved() async {
    if (busy || savedSlot == null || bank == null) return false;
    final binding = _binding;
    try {
      final restored = SoloGame.restore(savedSlot!.game, bank!, random, now);
      game = restored;
      selected = savedSlot!.selected;
      attemptId = savedSlot!.id;
      completedAt = savedSlot!.completedAt;
      receipt = null;
      failure = null;
      saved = true;
      if (!lifecycle.isForeground) game!.pause(now);
      _emit();
      if (restored.status == SoloStatus.finished) await finish();
      return _current(binding) && identical(restored, game);
    } catch (_) {
      game = null;
      failure = SoloRepository.invalid;
      _emit();
      return false;
    }
  }

  void choose(GeometryShape shape) {
    if (game?.interactive != true) return;
    selected = shape;
    _emit();
    unawaited(checkpoint());
  }

  Map<String, Object?> scan(String target) {
    final active = game;
    if (active == null || selected == null) return {'type': 'selection'};
    final result = active.scan(active.stage.name, selected!.name, target, now);
    if (['solid', 'correct', 'wrong'].contains(result['type'])) selected = null;
    _emit();
    unawaited(checkpoint());
    return result;
  }

  void hint() {
    if (game?.toggleHint() == true) {
      _emit();
      unawaited(checkpoint());
    }
  }

  void skip() {
    if (game?.skip(now) == true) {
      selected = null;
      _emit();
      unawaited(checkpoint());
    }
  }

  void continueReview() {
    if (game?.continueReview(now) != true) return;
    selected = null;
    _emit();
    unawaited(_afterAdvance());
  }

  void tick() {
    if (_disposed || game == null) return;
    if (game!.update(now)) {
      selected = null;
      unawaited(_afterAdvance());
    }
    _emit();
  }

  Future<void> _afterAdvance() async {
    await checkpoint();
    if (game?.status == SoloStatus.finished) await finish();
  }

  void pause() {
    game?.pause(now);
    _emit();
    unawaited(checkpoint());
  }

  void resume() {
    if (lifecycle.isForeground) {
      game?.resume(now);
      _emit();
      unawaited(checkpoint());
    }
  }

  Future<bool> checkpoint() async {
    final active = game, id = attemptId, binding = _binding;
    if (active == null || id == null || !_current(binding)) return false;
    final generation = ++_checkpointGeneration;
    saved = false;
    _emit();
    if (active.status == SoloStatus.finished) {
      completedAt ??= clock.now().millisecondsSinceEpoch;
    }
    final slot = SoloSlot(
      id: id,
      partition: binding.partition,
      game: active.checkpoint(now).cast<String, dynamic>(),
      selected: selected,
      completedAt: completedAt,
    );
    final result = await repository.save(binding, slot);
    if (!_current(binding) || !identical(active, game)) return false;
    // An older queued write cannot announce that newer progress is durable.
    if (generation != _checkpointGeneration) return result.isSuccess;
    saved = result.isSuccess;
    if (saved) {
      savedSlot = slot;
      failure = null;
    } else {
      failure = result.failureOrNull;
    }
    _emit();
    return saved;
  }

  Future<void> finish() {
    final binding = _binding, active = game, id = attemptId;
    if (active == null ||
        id == null ||
        active.status != SoloStatus.finished ||
        receipt != null) {
      return Future.value();
    }
    if (_finishing != null &&
        _finishingActor == binding &&
        identical(_finishingGame, active)) {
      return _finishing!;
    }
    final future = () async {
      if (!await checkpoint() ||
          !_current(binding) ||
          !identical(active, game) ||
          id != attemptId) {
        return;
      }
      final result = await repository.finalize(
        binding,
        active,
        id,
        completedAt!,
      );
      if (!_current(binding) || !identical(active, game) || id != attemptId) {
        return;
      }
      receipt = result.valueOrNull;
      failure = result.failureOrNull;
      _emit();
    }();
    _finishing = future;
    _finishingGame = active;
    _finishingActor = binding;
    future.whenComplete(() {
      if (identical(_finishing, future)) {
        _finishing = null;
        _finishingGame = null;
        _finishingActor = null;
      }
    });
    return future;
  }

  Future<bool> leave() async {
    pause();
    if (!await checkpoint()) return false;
    game = null;
    selected = null;
    _emit();
    return true;
  }

  Future<void> discard() async {
    final binding = _binding;
    final result = await repository.clear(binding);
    if (!_current(binding)) return;
    if (result.isSuccess) {
      savedSlot = null;
      game = null;
      selected = null;
      failure = null;
      saved = false;
    } else {
      failure = result.failureOrNull;
    }
    _emit();
  }

  void _lifecycleChanged() {
    if (!lifecycle.isForeground) pause();
  }

  void _actorChanged(ActorBinding binding) {
    if (binding == _binding || _disposed) return;
    game?.pause(now);
    _binding = binding;
    game = null;
    selected = null;
    savedSlot = null;
    attemptId = null;
    completedAt = null;
    receipt = null;
    saved = false;
    busy = false;
    failure = SoloRepository.stale;
    _emit();
    unawaited(initialize());
  }

  @override
  void dispose() {
    _disposed = true;
    lifecycle.removeListener(_lifecycleChanged);
    unawaited(_sessionSubscription.cancel());
    super.dispose();
  }
}
