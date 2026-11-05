import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/features/service_registry.dart';
import '../../../core/records/formative_record.dart';
import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';

const learningReflectionControllerKey =
    ServiceKey<LearningReflectionController>('learning.reflectionController');

/// A presentation owner over the shared record ports, with no table or outbox.
/// Failed reflections remain in memory for an explicit retry in the same actor.
final class LearningReflectionController extends ChangeNotifier {
  LearningReflectionController({
    required FormativeRecordReader reader,
    required FormativeRecordWriter writer,
    required AuthSession sessions,
  }) : _reader = reader,
       _writer = writer,
       _sessions = sessions {
    _sessionSubscription = sessions.bindings.listen(_bind);
    _bind(sessions.current);
  }

  final FormativeRecordReader _reader;
  final FormativeRecordWriter _writer;
  final AuthSession _sessions;
  late final StreamSubscription<ActorBinding> _sessionSubscription;
  StreamSubscription<Result<List<ModuleReflection>>>? _readerSubscription;
  Future<void> _saveTail = Future<void>.value();
  ActorBinding? _actor;
  int _generation = 0;
  int _readGeneration = 0;
  int _nextSave = 0;
  bool _disposed = false;
  bool _loading = true;
  List<ModuleReflection> _records = const [];
  AppFailure? _readFailure;
  DurableRecordReceipt? _lastReceipt;
  final Set<int> _activeSaves = {};
  final Map<ModuleActivity, int> _latestSave = {};
  final Map<ModuleActivity, ModuleReflection> _unsaved = {};
  final Map<ModuleActivity, AppFailure> _saveFailures = {};

  ActorBinding get actor => _actor!;
  List<ModuleReflection> get records => _records;
  bool get loading => _loading;
  bool get saving => _activeSaves.isNotEmpty;
  AppFailure? get readFailure => _readFailure;
  AppFailure? get saveFailure => _saveFailures.values.firstOrNull;
  DurableRecordReceipt? get lastReceipt => _lastReceipt;
  List<ModuleReflection> get failedReflections => List.unmodifiable([
    for (final activity in ModuleActivity.values)
      if (_saveFailures.containsKey(activity) && _unsaved[activity] != null)
        _unsaved[activity]!,
  ]);

  bool _current(ActorBinding actor, int generation) =>
      !_disposed &&
      generation == _generation &&
      _actor == actor &&
      _sessions.isCurrent(actor);

  void _bind(ActorBinding actor) {
    if (_disposed || _actor == actor) {
      return;
    }
    _generation++;
    _actor = actor;
    _records = const [];
    _lastReceipt = null;
    _readFailure = null;
    _activeSaves.clear();
    _latestSave.clear();
    _unsaved.clear();
    _saveFailures.clear();
    // A slow save belonging to A never blocks B's independent work.
    _saveTail = Future<void>.value();
    _startRead();
  }

  void _startRead() {
    final actor = _actor!;
    final generation = _generation;
    final readGeneration = ++_readGeneration;
    bool current() =>
        _current(actor, generation) && readGeneration == _readGeneration;
    final old = _readerSubscription;
    _readerSubscription = null;
    if (old != null) unawaited(old.cancel());
    _loading = true;
    _readFailure = null;
    try {
      _readerSubscription = _reader
          .watchReflections(actor)
          .listen(
            (result) {
              if (!current()) {
                return;
              }
              _loading = false;
              switch (result) {
                case Success<List<ModuleReflection>>(:final value):
                  _records = List.unmodifiable(value);
                  _readFailure = null;
                case Failed<List<ModuleReflection>>(:final failure):
                  _readFailure = failure;
              }
              notifyListeners();
            },
            onError: (Object _, StackTrace _) {
              if (!current()) {
                return;
              }
              _loading = false;
              _readFailure = _storageFailure;
              notifyListeners();
            },
          );
    } catch (_) {
      _loading = false;
      _readFailure = _storageFailure;
    }
    notifyListeners();
  }

  void retryRead() {
    if (!_disposed && _sessions.isCurrent(actor)) {
      _startRead();
    }
  }

  Future<Result<DurableRecordReceipt>> save(
    ModuleReflection reflection, {
    ActorBinding? actor,
  }) {
    final capturedActor = actor ?? _sessions.current;
    final generation = _generation;
    if (!_current(capturedActor, generation)) {
      return Future.value(const Failed(_staleFailure));
    }
    final request = ++_nextSave;
    _latestSave[reflection.activity] = request;
    _unsaved[reflection.activity] = reflection;
    _saveFailures.remove(reflection.activity);
    _activeSaves.add(request);
    notifyListeners();
    final task = _saveTail.then((_) async {
      if (!_current(capturedActor, generation)) {
        return const Failed<DurableRecordReceipt>(_staleFailure);
      }
      Result<DurableRecordReceipt> result;
      try {
        result = await _writer.saveReflection(
          actor: capturedActor,
          reflection: reflection,
        );
      } catch (_) {
        result = const Failed(_storageFailure);
      }
      if (!_current(capturedActor, generation)) {
        return const Failed<DurableRecordReceipt>(_staleFailure);
      }
      if (result case Success<DurableRecordReceipt>(:final value)) {
        if (value.actor != capturedActor) {
          result = const Failed(_staleFailure);
        }
      }
      _activeSaves.remove(request);
      if (_latestSave[reflection.activity] == request) {
        switch (result) {
          case Success<DurableRecordReceipt>(:final value):
            _lastReceipt = value;
            _unsaved.remove(reflection.activity);
            _saveFailures.remove(reflection.activity);
          case Failed<DurableRecordReceipt>(:final failure):
            _saveFailures[reflection.activity] = failure;
        }
      }
      notifyListeners();
      return result;
    });
    _saveTail = task.then<void>((_) {});
    return task;
  }

  Future<void> retryFailed() async {
    if (_disposed || saving) {
      return;
    }
    final capturedActor = actor;
    final pending = failedReflections;
    for (final reflection in pending) {
      if (_disposed || !_sessions.isCurrent(capturedActor)) {
        return;
      }
      await save(reflection, actor: capturedActor);
    }
  }

  @override
  void dispose() {
    if (_disposed) {
      return;
    }
    _disposed = true;
    _generation++;
    unawaited(_readerSubscription?.cancel() ?? Future<void>.value());
    unawaited(_sessionSubscription.cancel());
    _unsaved.clear();
    _saveFailures.clear();
    super.dispose();
  }

  static const _staleFailure = AppFailure(
    code: FailureCode.stale,
    message: 'This reflection belongs to a previous session or scope.',
  );
  static const _storageFailure = AppFailure(
    code: FailureCode.storage,
    message: 'The reflection has not been durably saved. Please retry.',
  );
}
