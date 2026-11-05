import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/lifecycle/app_lifecycle.dart';
import '../../../core/network/network_policy.dart';
import '../../../core/result.dart';
import '../../../core/runtime/clock.dart';
import '../../../core/runtime/random_source.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../data/classroom_repository.dart';
import '../domain/classroom_models.dart';

typedef ClassroomScope = ({
  ActorBinding actor,
  int generation,
  String? classId,
  String? roomId,
  String? attemptId,
  ClassroomCommand? pendingGame,
});

/// Captured entity revision/issuance. Refresh never replaces an invitation ID.
final class ClassroomManagementDraft {
  ClassroomManagementDraft({
    required this.action,
    required this.id,
    required this.classId,
    required this.serverName,
    this.revision,
    this.name = '',
  });
  final String action, id, classId;
  int? revision;
  String serverName, name;
  bool get invitation =>
      action == 'cancel_invite' || action == 'decline_invite';
  bool get rename => action == 'rename_class' || action == 'rename_room';
  bool get room => action.endsWith('_room');
  ClassroomCommand command() => ClassroomCommand(action, {
    if (invitation)
      'invite_id': id
    else if (action == 'remove_member') ...{
      'class_id': classId,
      'user_id': id,
      'expected_revision': revision,
    } else ...{
      room ? 'room_id' : 'class_id': id,
      'expected_revision': revision,
    },
    if (rename) 'name': name.trim(),
  });
}

/// One owner for the classroom scope, polling and unknown-outcome recovery.
/// The controller presents server projections; it does not evaluate answers.
final class ClassroomController extends ChangeNotifier {
  ClassroomController({
    required this.repository,
    required this.sessions,
    Clock clock = const SystemClock(),
    this._lifecycle,
    RandomSource? random,
  }) : _clock = clock,
       _random = random ?? SecureRandomSource(),
       _policy = NetworkPolicy(
         sessions: sessions,
         clock: clock,
         random: random,
       ) {
    _binding = sessions.current;
    _sessionSubscription = sessions.bindings.listen(_onActor);
    _lifecycle?.addListener(_onLifecycle);
  }
  final ClassroomRepository repository;
  final AuthSession sessions;
  final Clock _clock;
  final AppLifecycleController? _lifecycle;
  final RandomSource _random;
  final NetworkPolicy _policy;
  late final StreamSubscription<ActorBinding> _sessionSubscription;
  late ActorBinding _binding;
  ClassroomSnapshot? snapshot;
  ClassroomAttempt? attempt;
  ClassroomManagementDraft? management;
  ClassroomCommand? pendingGame;
  ClassroomCommand? uncertainCommand;
  AppFailure? failure;
  String? serverCode;
  String? selectedClassId, selectedRoomId;
  String? noticeKey;
  bool loading = false, mutating = false, stale = false, denied = false;
  bool requiresReconciliation = false;
  bool _visible = false, _disposed = false;
  bool _authorizationBlocked = false;
  int _generation = 0, _failures = 0, _attemptReceivedAt = 0;
  DateTime? _serverNow;
  int _serverReceivedAt = 0;
  Future<bool>? _read;
  Timer? _poll, _autoAdvance;

  bool get configured => repository.configured;
  bool get guest => sessions.current.isGuest;
  bool get busy => loading || mutating;
  bool get canWrite =>
      configured &&
      !guest &&
      !_authorizationBlocked &&
      _foreground &&
      !busy &&
      !stale &&
      !requiresReconciliation &&
      pendingGame == null;
  bool get teacher => snapshot?.profile.isTeacher == true;
  bool get crud => snapshot?.crudAvailable == true;
  bool get foreground => _foreground;
  ClassroomScope captureScope() => (
    actor: sessions.current,
    generation: _generation,
    classId: selectedClassId,
    roomId: selectedRoomId,
    attemptId: attempt?.id,
    pendingGame: pendingGame,
  );
  bool isScopeCurrent(ClassroomScope scope) =>
      _current(scope.actor, scope.generation) &&
      selectedClassId == scope.classId &&
      selectedRoomId == scope.roomId &&
      attempt?.id == scope.attemptId &&
      identical(pendingGame, scope.pendingGame);
  DateTime get serverTime =>
      _serverNow?.add(
        Duration(
          milliseconds: (_clock.monotonicMilliseconds() - _serverReceivedAt)
              .clamp(0, 1 << 53),
        ),
      ) ??
      _clock.now();
  ClassroomClass? get currentClass =>
      _find(snapshot?.classes, (c) => c.id == selectedClassId);
  ClassroomRoom? get currentRoom {
    final room = snapshot?.room;
    return room?.id == selectedRoomId ? room : null;
  }

  int get reviewRemainingMs => attempt == null
      ? 0
      : (attempt!.readyInMs -
                (_clock.monotonicMilliseconds() - _attemptReceivedAt))
            .clamp(0, 1 << 53);
  int get answeringElapsedMs =>
      (attempt?.elapsed ?? 0) +
      (attempt?.status == 'running'
          ? (_clock.monotonicMilliseconds() - _attemptReceivedAt).clamp(
              0,
              1 << 53,
            )
          : 0);

  void setVisible(bool value) {
    if (_disposed || value == _visible) return;
    _visible = value;
    if (!value) {
      _stopTimers();
      return;
    }
    if (_foreground) unawaited(refresh());
  }

  bool get _foreground => _lifecycle?.isForeground ?? true;
  void _onLifecycle() {
    if (!_foreground) {
      _stopTimers();
      stale = snapshot != null;
      notifyListeners();
      return;
    }
    if (_visible) unawaited(refresh());
  }

  void _onActor(ActorBinding actor) {
    if (actor == _binding || _disposed) return;
    _binding = actor;
    _generation++;
    _read = null;
    _stopTimers();
    snapshot = null;
    attempt = null;
    management = null;
    pendingGame = null;
    uncertainCommand = null;
    selectedClassId = null;
    selectedRoomId = null;
    loading = false;
    mutating = false;
    stale = false;
    denied = false;
    _authorizationBlocked = false;
    requiresReconciliation = false;
    failure = null;
    noticeKey = null;
    serverCode = null;
    notifyListeners();
    if (_visible && _foreground && !guest) unawaited(refresh());
  }

  Future<bool> refresh({bool explicit = false, bool heartbeat = false}) {
    if (_disposed ||
        guest ||
        !configured ||
        mutating ||
        _authorizationBlocked && !explicit) {
      return Future.value(false);
    }
    if (_read case final active?) return active;
    final generation = _generation,
        actor = sessions.current,
        roomId = selectedRoomId;
    loading = true;
    notifyListeners();
    final completer = Completer<bool>();
    _read = completer.future;
    Future<void>(() async {
      try {
        final response = await repository.send(
          ClassroomCommand(heartbeat ? 'heartbeat' : 'snapshot', {
            'room_id': ?roomId,
          }),
          actor,
        );
        if (!_current(actor, generation)) {
          completer.complete(false);
          return;
        }
        if (!response.isSuccess) {
          _handleFailure(response, scopedRead: roomId != null);
          _failures++;
          completer.complete(false);
          return;
        }
        _apply(response);
        if (explicit && requiresReconciliation) {
          requiresReconciliation = false;
          uncertainCommand = null;
          noticeKey = 'classroom.reconciled';
        }
        _failures = 0;
        completer.complete(true);
      } catch (_) {
        if (_current(actor, generation)) {
          failure = const AppFailure(
            code: FailureCode.network,
            message: 'classroom.error.network',
          );
          stale = snapshot != null;
          _failures++;
        }
        completer.complete(false);
      } finally {
        if (_current(actor, generation)) {
          loading = false;
          _read = null;
          notifyListeners();
          _schedule();
        }
      }
    });
    return completer.future;
  }

  void selectClass(String id) {
    if (busy || !_hasClass(id)) return;
    _changeScope();
    selectedClassId = id;
    selectedRoomId = null;
    attempt = null;
    management = null;
    denied = false;
    notifyListeners();
    _schedule();
  }

  Future<bool> openRoom(String id) async {
    final room = _find(snapshot?.rooms, (r) => r.id == id);
    if (room == null || busy) return false;
    _changeScope();
    selectedRoomId = id;
    selectedClassId = room.classId;
    attempt = null;
    management = null;
    denied = false;
    notifyListeners();
    return refresh(explicit: true);
  }

  void dashboard() {
    if (mutating) return;
    _changeScope();
    selectedRoomId = null;
    attempt = null;
    management = null;
    notifyListeners();
    unawaited(refresh());
  }

  void _changeScope() {
    _generation++;
    _read = null;
    loading = false;
    if (pendingGame != null) {
      uncertainCommand = pendingGame;
      requiresReconciliation = true;
      pendingGame = null;
    }
    _stopTimers();
  }

  Future<bool> perform(ClassroomCommand command) async {
    if (_disposed || !canWrite) return false;
    final blocked = _preflight(command);
    if (blocked != null) {
      failure = blocked;
      serverCode = null;
      notifyListeners();
      return false;
    }
    final generation = _generation, actor = sessions.current;
    mutating = true;
    failure = null;
    noticeKey = null;
    _stopTimers();
    notifyListeners();
    final response = await repository.send(command, actor);
    if (!_current(actor, generation)) return false;
    mutating = false;
    if (!response.isSuccess) {
      _handleFailure(response);
      if (response.uncertain) {
        uncertainCommand = command;
        requiresReconciliation = true;
      }
      notifyListeners();
      _schedule();
      return false;
    }
    _apply(response);
    if (response.createdClassId != null &&
        _hasClass(response.createdClassId!)) {
      selectedClassId = response.createdClassId;
    }
    if (response.createdRoomId != null && response.snapshot?.room != null) {
      selectedRoomId = response.createdRoomId;
      selectedClassId = response.snapshot!.room!.classId;
    }
    if (response.deletedRoomId == selectedRoomId) {
      selectedRoomId = null;
      attempt = null;
    }
    if (response.deletedClassId == selectedClassId) {
      selectedClassId = null;
      selectedRoomId = null;
      attempt = null;
    }
    if (response.attempt != null) _applyAttempt(response.attempt!);
    noticeKey = 'classroom.saved';
    notifyListeners();
    _schedule();
    return true;
  }

  AppFailure? _preflight(ClassroomCommand command) {
    AppFailure blocked(String code, [FailureCode type = FailureCode.invalid]) =>
        AppFailure(code: type, message: 'classroom.error.$code');
    if (!command.valid) return blocked('invalid_payload');
    if (command.management && !crud) {
      return blocked('capability', FailureCode.unavailable);
    }
    final data = snapshot;
    if (data == null) return blocked('refresh_required');
    final classId = command.payload['class_id'] as String?;
    final roomId = command.payload['room_id'] as String?;
    final classEntity = _find(data.classes, (c) => c.id == classId);
    final room = _find(data.rooms, (r) => r.id == roomId);
    if (command.action == 'create_class' && !teacher) {
      return blocked('forbidden', FailureCode.unauthorized);
    }
    if (const {
      'create_room',
      'invite',
      'rename_class',
      'archive_class',
      'restore_class',
      'delete_class',
      'remove_member',
    }.contains(command.action)) {
      if (classId == null || !data.ownsClass(classId)) {
        return blocked('forbidden', FailureCode.unauthorized);
      }
    }
    if (const {
      'rename_room',
      'archive_room',
      'restore_room',
      'delete_room',
      'set_room',
    }.contains(command.action)) {
      if (roomId == null || !data.ownsRoom(roomId)) {
        return blocked('forbidden', FailureCode.unauthorized);
      }
    }
    if (const {'archive_class', 'remove_member'}.contains(command.action) &&
        data.rooms.any((r) => r.classId == classId && r.status == 'playing')) {
      return blocked('room_playing');
    }
    if (command.action == 'archive_room' && room?.status == 'playing') {
      return blocked('room_playing');
    }
    if (command.action == 'set_room' &&
        (room?.closed == true || room?.archived == true)) {
      return blocked('room_closed');
    }
    if (const {'create_room', 'invite'}.contains(command.action) &&
        classEntity?.archived == true) {
      return blocked('archived');
    }
    if (command.action == 'rotate_pin') {
      final id = command.payload['id'] as String;
      if (command.payload['kind'] == 'class') {
        final item = _find(data.classes, (c) => c.id == id);
        if (!data.ownsClass(id)) {
          return blocked('forbidden', FailureCode.unauthorized);
        }
        if (item?.archived == true) return blocked('archived');
      } else {
        final item = _find(data.rooms, (r) => r.id == id);
        if (!data.ownsRoom(id)) {
          return blocked('forbidden', FailureCode.unauthorized);
        }
        if (item?.closed == true || item?.archived == true) {
          return blocked('room_closed');
        }
      }
    }
    if (const {
          'join_pin',
          'join_room',
          'accept_invite',
          'decline_invite',
          'start_attempt',
        }.contains(command.action) &&
        teacher) {
      return blocked('forbidden', FailureCode.unauthorized);
    }
    if (const {
      'accept_invite',
      'decline_invite',
      'cancel_invite',
    }.contains(command.action)) {
      final id = command.payload['invite_id'];
      final exists = command.action == 'cancel_invite'
          ? teacher &&
                data.classes
                    .where((c) => data.ownsClass(c.id))
                    .any((c) => c.invites.any((i) => i.id == id))
          : data.invites.any((i) => i.id == id);
      if (!exists) return blocked('stale_invite', FailureCode.conflict);
    }
    if (const {'join_room', 'start_attempt'}.contains(command.action) &&
        room?.archived == true) {
      return blocked('archived');
    }
    if (command.action == 'join_room' && room?.closed == true) {
      return blocked('room_closed');
    }
    return null;
  }

  void editClass(ClassroomClass item, String action) => _openDraft(
    ClassroomManagementDraft(
      action: action,
      id: item.id,
      classId: item.id,
      revision: item.revision,
      serverName: item.name,
      name: item.name,
    ),
  );
  void editRoom(ClassroomRoom item, String action) => _openDraft(
    ClassroomManagementDraft(
      action: action,
      id: item.id,
      classId: item.classId,
      revision: item.revision,
      serverName: item.name,
      name: item.name,
    ),
  );
  void removeMember(ClassroomClass item, ClassroomMember member) => _openDraft(
    ClassroomManagementDraft(
      action: 'remove_member',
      id: member.id,
      classId: item.id,
      revision: item.revision,
      serverName: member.name,
    ),
  );
  void editInvite(ClassroomInvite invite, {required bool cancel}) => _openDraft(
    ClassroomManagementDraft(
      action: cancel ? 'cancel_invite' : 'decline_invite',
      id: invite.id,
      classId: invite.classId,
      serverName: invite.name.isNotEmpty ? invite.name : invite.className,
    ),
  );
  void _openDraft(ClassroomManagementDraft draft) {
    if (!canWrite || !crud) return;
    management = draft;
    failure = null;
    noticeKey = null;
    notifyListeners();
  }

  void closeManagement() {
    if (mutating) return;
    management = null;
    notifyListeners();
  }

  Future<bool> saveManagement() async {
    final draft = management;
    if (draft == null) return false;
    final saved = await perform(draft.command());
    if (saved && identical(management, draft)) management = null;
    if (!_disposed) notifyListeners();
    return saved;
  }

  Future<bool> refreshManagement() async {
    final draft = management;
    if (draft == null || mutating) return false;
    final ok = await refresh(explicit: true);
    if (!ok || !identical(management, draft) || draft.invitation) return ok;
    if (draft.room) {
      final room = _find(snapshot?.rooms, (r) => r.id == draft.id);
      if (room == null) return false;
      draft.revision = room.revision;
      draft.serverName = room.name;
    } else {
      final item = _find(snapshot?.classes, (c) => c.id == draft.classId);
      if (item == null) return false;
      draft.revision = item.revision;
      if (draft.action != 'remove_member') draft.serverName = item.name;
    }
    failure = null;
    notifyListeners();
    return true;
  }

  Future<bool> startAttempt() async {
    final room = currentRoom;
    if (room == null) return false;
    if (room.closed && room.myAttempt != null) {
      _applyAttempt(room.myAttempt!);
      notifyListeners();
      return true;
    }
    return perform(ClassroomCommand('start_attempt', {'room_id': room.id}));
  }

  Future<bool> gameCommand(String action, {String? shape}) async {
    final state = attempt;
    if (state == null || !canWrite || state.terminal) return false;
    if (action == 'advance'
        ? reviewRemainingMs > 0 ||
              !const {'review', 'feedback'}.contains(state.status)
        : state.status != 'running') {
      return false;
    }
    final bytes = List.generate(16, (_) => _random.nextInt(256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    final hex = bytes.map((n) => n.toRadixString(16).padLeft(2, '0')).join();
    pendingGame = ClassroomCommand(action, {
      'attempt_id': state.id,
      'index': state.index,
      'event_id':
          '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}',
      if (action == 'answer') ...{
        'kind': state.stage,
        'shape': shape,
        'target': state.stage == 'solid' ? 'r1' : 'r2',
      },
    });
    return retryPendingGame();
  }

  Future<bool> retryPendingGame() async {
    final command = pendingGame, state = attempt;
    if (command == null || state == null || mutating || guest || !_foreground) {
      return false;
    }
    final generation = _generation, actor = sessions.current, id = state.id;
    mutating = true;
    _stopTimers();
    failure = null;
    notifyListeners();
    final response = await repository.send(command, actor);
    if (!_current(actor, generation) ||
        attempt?.id != id ||
        !identical(pendingGame, command)) {
      return false;
    }
    mutating = false;
    if (!response.isSuccess) {
      _handleFailure(response);
      if (!response.uncertain) pendingGame = null;
      notifyListeners();
      _schedule();
      return false;
    }
    if (response.attempt?.id != id ||
        response.attempt?.roomId != selectedRoomId) {
      failure = const AppFailure(
        code: FailureCode.invalid,
        message: 'classroom.error.invalid_response',
      );
      notifyListeners();
      return false;
    }
    pendingGame = null;
    _apply(response);
    _applyAttempt(response.attempt!);
    noticeKey = response.resultType == 'blocked' ? 'classroom.resynced' : null;
    notifyListeners();
    _schedule();
    return true;
  }

  void leaveGame({required ClassroomScope expectedScope}) {
    if (mutating || !isScopeCurrent(expectedScope)) return;
    if (pendingGame != null) {
      uncertainCommand = pendingGame;
      requiresReconciliation = true;
      pendingGame = null;
    }
    attempt = null;
    _autoAdvance?.cancel();
    notifyListeners();
    unawaited(refresh(explicit: true));
  }

  void _apply(ClassroomResponse response) {
    if (response.snapshot case final value?) {
      snapshot = value;
      _serverNow = value.serverNow;
      _serverReceivedAt = _clock.monotonicMilliseconds();
      if (!_hasClass(selectedClassId)) {
        if (management != null && !_hasClass(management!.classId)) {
          management = null;
        }
        selectedClassId = value.classes.firstOrNull?.id;
      }
      if (selectedRoomId != null &&
          !value.rooms.any((r) => r.id == selectedRoomId)) {
        selectedRoomId = null;
        attempt = null;
        pendingGame = null;
        management = null;
        noticeKey = 'classroom.access_revoked';
      }
      if (attempt != null) {
        if (value.room?.myAttempt case final state?) {
          _applyAttempt(state);
        }
      }
    }
    failure = null;
    serverCode = null;
    stale = false;
    denied = false;
    _authorizationBlocked = false;
  }

  void _applyAttempt(ClassroomAttempt state) {
    if (selectedRoomId != state.roomId) return;
    attempt = state;
    _attemptReceivedAt = _clock.monotonicMilliseconds();
  }

  void _handleFailure(ClassroomResponse response, {bool scopedRead = false}) {
    failure = response.failure;
    serverCode = response.serverCode;
    stale = snapshot != null;
    if (response.failure?.code == FailureCode.unauthorized) {
      // Revoked access must never leave a readable old board, attempt or cache.
      _changeScope();
      snapshot = null;
      attempt = null;
      pendingGame = null;
      selectedRoomId = null;
      selectedClassId = null;
      management = null;
      requiresReconciliation = false;
      uncertainCommand = null;
      denied = true;
      _authorizationBlocked = !scopedRead;
      noticeKey = 'classroom.access_revoked';
      stale = false;
      if (scopedRead && _visible && _foreground) {
        final actor = sessions.current, generation = _generation;
        scheduleMicrotask(() {
          if (_visible && _foreground && _current(actor, generation)) {
            unawaited(refresh());
          }
        });
      }
      notifyListeners();
    }
  }

  bool _hasClass(String? id) =>
      snapshot?.classes.any((c) => c.id == id) == true;
  bool _current(ActorBinding actor, int generation) =>
      !_disposed && generation == _generation && sessions.isCurrent(actor);
  void _schedule() {
    _stopTimers();
    if (!_visible ||
        !_foreground ||
        guest ||
        !configured ||
        _disposed ||
        _authorizationBlocked ||
        mutating) {
      return;
    }
    if (attempt?.status == 'feedback' &&
        pendingGame == null &&
        !requiresReconciliation &&
        !stale) {
      _autoAdvance = Timer(
        Duration(milliseconds: reviewRemainingMs),
        () => unawaited(gameCommand('advance')),
      );
    }
    Duration delay = const Duration(seconds: 20);
    if (failure case final problem?) {
      final retry = _policy.retryDelay(_failures, problem);
      if (retry == null) return;
      delay = retry > delay ? retry : delay;
    }
    _poll = Timer(delay, () => unawaited(refresh(heartbeat: true)));
  }

  void _stopTimers() {
    _poll?.cancel();
    _poll = null;
    _autoAdvance?.cancel();
    _autoAdvance = null;
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _generation++;
    _stopTimers();
    unawaited(_sessionSubscription.cancel());
    _lifecycle?.removeListener(_onLifecycle);
    super.dispose();
  }
}

T? _find<T>(Iterable<T>? items, bool Function(T) predicate) {
  if (items == null) return null;
  for (final item in items) {
    if (predicate(item)) return item;
  }
  return null;
}
