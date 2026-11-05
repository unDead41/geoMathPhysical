import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/geometry/geometry_card_provider.dart';
import '../../../core/geometry/geometry_card_view.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/navigation/app_navigation.dart';
import '../../../core/preferences/preferences.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/widgets/widgets.dart';
import '../../duel/presentation/game_card_carousel.dart';
import '../../duel/presentation/game_question_content.dart';
import '../application/classroom_controller.dart';
import '../data/classroom_bank.dart';
import '../data/classroom_repository.dart';
import '../domain/classroom_models.dart';

/// Native teacher/student views share the foundation's shell and controls.
final class ClassroomScreen extends StatefulWidget {
  const ClassroomScreen({
    required this.controller,
    required this.geometry,
    required this.bank,
    this.onLogin,
    super.key,
  });
  final ClassroomController controller;
  final GeometryCardProvider geometry;
  final ClassroomBank bank;
  final VoidCallback? onLogin;
  @override
  State<ClassroomScreen> createState() => _ClassroomScreenState();
}

final class _ClassroomScreenState extends State<ClassroomScreen> {
  ClassroomController get c => widget.controller;
  AppStrings get strings => AppStrings.of(context);
  String t(String key, [Map<String, Object> parameters = const {}]) => strings
      .text('classroom.${key.replaceAll('_', '.')}', parameters: parameters);
  bool _archive = false, _visible = true;
  GeometryShape? _solid, _net;
  String _gameIdentity = '';
  Timer? _ticker;
  late Future<Result<Map<String, ClassroomQuestion>>> _bank;

  @override
  void initState() {
    super.initState();
    _bank = widget.bank.load();
    c.addListener(_changed);
    _syncTicker();
  }

  void _syncTicker() {
    if (!_visible ||
        !c.foreground ||
        c.attempt == null && c.currentRoom == null) {
      _ticker?.cancel();
      _ticker = null;
      return;
    }
    _ticker ??= Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  void _changed() {
    _syncTicker();
    final state = c.attempt;
    final identity = state == null
        ? ''
        : '${state.id}:${state.index}:${state.stage}:${state.status}';
    if (identity != _gameIdentity) {
      _solid = null;
      _net = null;
      _gameIdentity = identity;
    }
    if (mounted) setState(() {});
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _visible = AppRouteScope.maybeOf(context)?.isCurrent ?? true;
    _syncTicker();
    // Avoid notification while an inherited presentation value is rebuilding.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) c.setVisible(_visible);
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    c.removeListener(_changed);
    c.setVisible(false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final room = c.currentRoom;
    return GeoMathScaffold(
      title: c.attempt != null
          ? t('question', {'number': c.attempt!.index + 1})
          : room?.name ?? t('title'),
      subtitle: c.attempt == null && room == null ? t('intro') : null,
      onBack: c.attempt != null
          ? _leaveGame
          : c.selectedRoomId != null
          ? c.dashboard
          : null,
      actions: [
        IconButton(
          key: const ValueKey('classroom-refresh'),
          tooltip: t('refresh'),
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          onPressed: c.busy || c.guest || !c.configured
              ? null
              : () => c.refresh(explicit: true),
          icon: c.loading
              ? const SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.refresh_rounded),
        ),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!c.configured)
            StatusNotice(
              key: const ValueKey('classroom-unavailable'),
              message: t('unavailable'),
            )
          else if (c.guest)
            EmptyState(
              key: const ValueKey('classroom-guest'),
              title: t('login'),
              message: t('guest'),
              icon: Icons.school_outlined,
              action: widget.onLogin == null
                  ? null
                  : ActionButton(label: t('login'), onPressed: widget.onLogin),
            )
          else ...[
            if (c.denied)
              StatusNotice(
                key: const ValueKey('classroom-denied'),
                message: t('access_revoked'),
                tone: StatusTone.error,
                liveRegion: true,
              ),
            if (c.failure != null) ...[
              _error(c.failure!),
              const SizedBox(height: 12),
            ],
            if (c.requiresReconciliation) ...[
              StatusNotice(
                key: const ValueKey('classroom-uncertain'),
                message: t('uncertain'),
                tone: StatusTone.warning,
                liveRegion: true,
                action: ActionButton(
                  label: t('refresh'),
                  busy: c.loading,
                  onPressed: () => c.refresh(explicit: true),
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (c.stale) ...[
              StatusNotice(message: t('stale'), tone: StatusTone.warning),
              const SizedBox(height: 12),
            ],
            if (c.noticeKey != null) ...[
              StatusNotice(
                message: strings.text(c.noticeKey!.replaceAll('_', '.')),
                liveRegion: true,
              ),
              const SizedBox(height: 12),
            ],
            if (c.loading && c.snapshot == null) Text(t('loading')),
            if (c.snapshot != null) ...[
              if (!c.crud) ...[
                StatusNotice(message: t('capability')),
                const SizedBox(height: 12),
              ],
              if (c.attempt != null)
                _game()
              else if (room != null)
                _room(room)
              else if (c.selectedRoomId != null)
                RetryPanel(
                  title: t('rooms'),
                  message: t('loading'),
                  retryLabel: t('refresh'),
                  busy: c.loading,
                  onRetry: () => c.refresh(explicit: true),
                )
              else
                _dashboard(),
            ],
          ],
        ],
      ),
    );
  }

  Widget _error(AppFailure failure) => StatusNotice(
    message: strings.text(
      failure.message.replaceAll('_', '.'),
      fallback: t('error.generic'),
    ),
    tone: StatusTone.error,
    liveRegion: true,
  );

  Widget _dashboard() {
    final snapshot = c.snapshot!, current = c.currentClass;
    final classes = snapshot.classes
        .where((item) => !c.teacher || item.archived == _archive)
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GeoMathCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.school_outlined, size: 44),
              const SizedBox(height: 12),
              SectionHeader(title: t(c.teacher ? 'teacher' : 'student')),
              Text(snapshot.profile.name),
              const SizedBox(height: 16),
              if (c.teacher)
                ActionButton(
                  key: const ValueKey('classroom-create-class'),
                  label: t('createClass'),
                  icon: Icons.add_rounded,
                  onPressed: c.canWrite ? _createClass : null,
                )
              else
                ActionButton(
                  key: const ValueKey('classroom-join-pin'),
                  label: t('joinPin'),
                  icon: Icons.key_rounded,
                  onPressed: c.canWrite ? _joinPin : null,
                ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (!c.teacher && snapshot.invites.isNotEmpty) ...[
          SectionHeader(title: t('invitations')),
          const SizedBox(height: 8),
          for (final invite in snapshot.invites) _invitation(invite, false),
        ],
        SectionHeader(title: t('classes')),
        if (c.teacher && c.crud)
          TextButton(
            onPressed: () => setState(() => _archive = !_archive),
            child: Text(t(_archive ? 'activeList' : 'archiveList')),
          ),
        if (classes.isEmpty)
          EmptyState(
            title: t('empty'),
            message: t(c.teacher ? 'emptyTeacher' : 'emptyStudent'),
          ),
        for (final item in classes)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: GeoMathCard(
              onTap: c.busy ? null : () => c.selectClass(item.id),
              semanticLabel: item.name,
              child: Row(
                children: [
                  const Icon(Icons.groups_outlined),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          item.archived
                              ? t('archived')
                              : item.teacherName.isNotEmpty
                              ? t('teacherBy', {'name': item.teacherName})
                              : t('active'),
                        ),
                      ],
                    ),
                  ),
                  if (current?.id == item.id)
                    const Icon(Icons.check_circle_outline),
                ],
              ),
            ),
          ),
        if (current != null &&
            (!c.teacher || current.archived == _archive)) ...[
          const SizedBox(height: 24),
          _class(current),
        ],
      ],
    );
  }

  Widget _class(ClassroomClass item) {
    final own = c.snapshot!.ownsClass(item.id);
    final rooms = c.snapshot!.rooms.where((r) => r.classId == item.id).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: item.name),
        const SizedBox(height: 12),
        if (own) ...[
          _pinPanel(
            item.activePin(c.serverTime),
            item.pinExpiresAt,
            'class',
            item.id,
            item.archived,
          ),
          if (c.crud)
            _managementActions(
              'class',
              item.archived,
              (action) => c.editClass(item, action),
            ),
          if (!item.archived) ...[
            const SizedBox(height: 12),
            ActionButton(
              label: t('invite'),
              kind: ActionButtonKind.secondary,
              onPressed: c.canWrite ? () => _invite(item) : null,
            ),
          ],
          const SizedBox(height: 20),
          SectionHeader(title: t('members')),
          for (final member in item.members)
            GeoMathCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    member.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text('@${member.username}'),
                  if (member.lastSeen != null)
                    Text(t('lastSeen', {'time': _date(member.lastSeen!)})),
                  if (c.crud)
                    ActionButton(
                      label: t('remove_member'),
                      kind: ActionButtonKind.secondary,
                      onPressed: c.canWrite
                          ? () {
                              c.removeMember(item, member);
                              _management();
                            }
                          : null,
                    ),
                ],
              ),
            ),
          if (item.invites.isNotEmpty) ...[
            const SizedBox(height: 16),
            SectionHeader(title: t('invitations')),
            for (final invite in item.invites) _invitation(invite, true),
          ],
        ],
        const SizedBox(height: 20),
        SectionHeader(title: t('rooms')),
        if (own && !item.archived) ...[
          const SizedBox(height: 12),
          ActionButton(
            key: const ValueKey('classroom-create-room'),
            label: t('createRoom'),
            icon: Icons.add_rounded,
            onPressed: c.canWrite ? () => _createRoom(item) : null,
          ),
        ],
        for (final room in rooms)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: GeoMathCard(
              key: ValueKey('classroom-room-${room.id}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    room.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      SyncStatusBadge(label: t(room.status)),
                      if (room.archived) SyncStatusBadge(label: t('archived')),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(t('membersCount', {'count': room.membersCount})),
                  const SizedBox(height: 12),
                  ActionButton(
                    label: t('monitor'),
                    kind: ActionButtonKind.secondary,
                    onPressed:
                        c.busy || !c.teacher && room.archived && !room.closed
                        ? null
                        : () => _openRoom(room),
                  ),
                  if (c.snapshot!.ownsRoom(room.id) && c.crud)
                    _managementActions(
                      'room',
                      room.archivedAt != null,
                      (action) => c.editRoom(room, action),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _managementActions(
    String kind,
    bool archived,
    void Function(String) open,
  ) => Wrap(
    spacing: 8,
    runSpacing: 4,
    children: [
      for (final action in [
        'rename_$kind',
        '${archived ? 'restore' : 'archive'}_$kind',
        'delete_$kind',
      ])
        TextButton(
          style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
          onPressed: c.canWrite
              ? () {
                  open(action);
                  _management();
                }
              : null,
          child: Text(t(action)),
        ),
    ],
  );

  Widget _invitation(ClassroomInvite invite, bool teacher) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: GeoMathCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            teacher ? '${invite.name} @${invite.username}' : invite.className,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          if (!teacher) ...[
            Text(t('teacherBy', {'name': invite.teacherName})),
            const SizedBox(height: 8),
            ActionButton(
              label: t('accept'),
              onPressed: c.canWrite
                  ? () => c.perform(
                      ClassroomCommand('accept_invite', {
                        'invite_id': invite.id,
                      }),
                    )
                  : null,
            ),
          ],
          if (c.crud)
            ActionButton(
              label: t(teacher ? 'cancel_invite' : 'decline_invite'),
              kind: ActionButtonKind.secondary,
              onPressed: c.canWrite
                  ? () {
                      c.editInvite(invite, cancel: teacher);
                      _management();
                    }
                  : null,
            ),
        ],
      ),
    ),
  );

  Widget _pinPanel(
    String? pin,
    DateTime? expires,
    String kind,
    String id,
    bool disabled,
  ) => GeoMathCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (pin != null) ...[
          SelectableText(
            pin,
            semanticsLabel: '${t('pin')}: $pin',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          if (expires != null) Text(t('expires', {'time': _date(expires)})),
        ] else
          Text(t('pinExpired')),
        const SizedBox(height: 12),
        ActionButton(
          label: t('rotate'),
          kind: ActionButtonKind.secondary,
          onPressed: c.canWrite && !disabled
              ? () async {
                  if (await _confirm(t('rotate'), t('rotateConfirm'))) {
                    await c.perform(
                      ClassroomCommand('rotate_pin', {'kind': kind, 'id': id}),
                    );
                  }
                }
              : null,
        ),
      ],
    ),
  );

  Widget _room(ClassroomRoom room) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(room.className, style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 12),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          SyncStatusBadge(label: t(room.status)),
          if (room.archived) SyncStatusBadge(label: t('archived')),
        ],
      ),
      const SizedBox(height: 16),
      if (c.snapshot!.ownsRoom(room.id)) ...[
        if (!room.closed)
          _pinPanel(
            room.activePin(c.serverTime),
            room.pinExpiresAt,
            'room',
            room.id,
            room.archived,
          ),
        if (room.status == 'open' && !room.archived) ...[
          const SizedBox(height: 12),
          ActionButton(
            label: t('startRoom'),
            onPressed: c.canWrite
                ? () => c.perform(
                    ClassroomCommand('set_room', {
                      'room_id': room.id,
                      'status': 'playing',
                    }),
                  )
                : null,
          ),
        ],
        if (!room.closed && !room.archived) ...[
          const SizedBox(height: 12),
          ActionButton(
            label: t('closeRoom'),
            kind: ActionButtonKind.danger,
            onPressed: c.canWrite
                ? () async {
                    if (await _confirm(
                      t('closeRoom'),
                      t('closeConfirm'),
                      danger: true,
                    )) {
                      await c.perform(
                        ClassroomCommand('set_room', {
                          'room_id': room.id,
                          'status': 'closed',
                        }),
                      );
                    }
                  }
                : null,
          ),
        ],
        if (c.crud)
          _managementActions(
            'room',
            room.archivedAt != null,
            (action) => c.editRoom(room, action),
          ),
      ] else if (!c.teacher) ...[
        StatusNotice(message: t('attemptInfo')),
        const SizedBox(height: 12),
        if (!room.archived || room.closed && room.myAttempt != null)
          ActionButton(
            label: t(room.closed ? 'viewAttempt' : 'startAttempt'),
            onPressed:
                c.canWrite &&
                    (room.status == 'playing' || room.myAttempt != null)
                ? c.startAttempt
                : null,
          ),
      ],
      const SizedBox(height: 24),
      SectionHeader(title: t('board')),
      const SizedBox(height: 8),
      if (!room.closed) Text(t('notFinal')),
      if (room.players.isEmpty) Text(t('noPlayers')),
      for (var i = 0; i < room.players.length; i++)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: GeoMathCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${room.players[i].waiting ? '—' : i + 1} · ${room.players[i].name}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(t(room.players[i].status)),
                if (!room.players[i].waiting) ...[
                  Text('${t('score')}: ${room.players[i].score}/10'),
                  Text(
                    '${t('time')}: ${_duration(room.players[i].displayedElapsed(c.serverTime))}',
                  ),
                ],
              ],
            ),
          ),
        ),
      const SizedBox(height: 20),
      ActionButton(
        label: t('backClasses'),
        kind: ActionButtonKind.secondary,
        onPressed: c.dashboard,
      ),
    ],
  );

  Widget _game() => FutureBuilder<Result<Map<String, ClassroomQuestion>>>(
    future: _bank,
    builder: (context, snapshot) {
      final state = c.attempt!;
      final bank = snapshot.data?.valueOrNull;
      if (bank == null || state.questions.any((id) => !bank.containsKey(id))) {
        return RetryPanel(
          key: const ValueKey('classroom-game-bank'),
          title: t('rooms'),
          message: snapshot.connectionState != ConnectionState.done
              ? t('loading')
              : t('error.bank'),
          retryLabel: t('refresh'),
          onRetry: () => setState(() => _bank = widget.bank.load()),
        );
      }
      final question = bank[state.questionId]!;
      final language = strings.locale.languageCode == 'en'
          ? AppLanguage.en
          : AppLanguage.ms;
      return Column(
        key: const ValueKey('classroom-game'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          StatusNotice(message: t('gameOnline')),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              SyncStatusBadge(label: '${t('score')}: ${state.score}/10'),
              SyncStatusBadge(
                label: '${t('time')}: ${_duration(c.answeringElapsedMs)}',
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (state.terminal) ...[
            SectionHeader(title: t('result')),
            const SizedBox(height: 12),
            Text(t(state.status)),
            for (var i = 0; i < state.answers.length; i++)
              ListTile(
                title: Text(t('question', {'number': i + 1})),
                subtitle: Text(
                  _answerOutcome(state.answers[i]['outcome'] as String?),
                ),
              ),
          ] else ...[
            Semantics(
              header: true,
              child: GameQuestionContent(
                key: const ValueKey('classroom-question-content'),
                text: question.localizedPrompt(language),
                languageCode: strings.locale.languageCode,
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            const SizedBox(height: 16),
            if (state.status == 'feedback')
              StatusNotice(message: t('feedback'), tone: StatusTone.success)
            else if (state.status == 'review') ...[
              StatusNotice(
                message: t(
                  state.lastOutcome == 'skipped' ? 'skipped' : 'wrong',
                ),
                tone: StatusTone.warning,
              ),
              const SizedBox(height: 12),
              Text(t('correctPair')),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  for (final kind in GeometryCardKind.values)
                    GeometryCardView(
                      shape: question.shape,
                      kind: kind,
                      provider: widget.geometry,
                      semanticLabel:
                          '${t('correctPair')} ${strings.text('shape.${question.shape.name}')}',
                      size: 120,
                    ),
                ],
              ),
            ] else ...[
              SectionHeader(title: t(state.stage == 'solid' ? 'r1' : 'r2')),
              const SizedBox(height: 12),
              _choices(GeometryCardKind.solid, state.stage == 'solid'),
              const SizedBox(height: 12),
              ActionButton(
                key: const ValueKey('classroom-scan-r1'),
                label: t('r1'),
                onPressed:
                    c.canWrite && state.stage == 'solid' && _solid != null
                    ? () => c.gameCommand('answer', shape: _solid!.name)
                    : null,
              ),
              const SizedBox(height: 20),
              _choices(GeometryCardKind.net, state.stage == 'net'),
              const SizedBox(height: 12),
              ActionButton(
                key: const ValueKey('classroom-scan-r2'),
                label: t('r2'),
                onPressed: c.canWrite && state.stage == 'net' && _net != null
                    ? () => c.gameCommand('answer', shape: _net!.name)
                    : null,
              ),
              const SizedBox(height: 16),
              if (state.hintUsed)
                StatusNotice(message: question.localizedHint(language))
              else
                ActionButton(
                  label: t('hint'),
                  kind: ActionButtonKind.secondary,
                  onPressed: c.canWrite ? () => c.gameCommand('hint') : null,
                ),
              const SizedBox(height: 12),
              ActionButton(
                label: t('skip'),
                kind: ActionButtonKind.secondary,
                onPressed: c.canWrite ? () => c.gameCommand('skip') : null,
              ),
            ],
            if (state.status == 'review' || state.status == 'feedback') ...[
              const SizedBox(height: 16),
              ActionButton(
                label: c.reviewRemainingMs > 0
                    ? t('readyIn', {
                        'seconds': (c.reviewRemainingMs / 1000).ceil(),
                      })
                    : t('continue'),
                onPressed: c.canWrite && c.reviewRemainingMs == 0
                    ? () => c.gameCommand('advance')
                    : null,
              ),
            ],
          ],
          if (c.pendingGame != null) ...[
            const SizedBox(height: 12),
            StatusNotice(
              message: t('pending'),
              tone: StatusTone.warning,
              action: ActionButton(
                label: t('retryAction'),
                busy: c.mutating,
                onPressed: c.retryPendingGame,
              ),
            ),
          ],
          const SizedBox(height: 20),
          ActionButton(
            label: t('leaveGame'),
            kind: ActionButtonKind.secondary,
            onPressed: _leaveGame,
          ),
        ],
      );
    },
  );

  Widget _choices(GeometryCardKind kind, bool active) {
    final state = c.attempt!;
    return GameCardCarousel(
      scopeKey: (state.id, state.index, state.stage, kind),
      keyPrefix: 'classroom-${kind.name}-carousel',
      itemCount: GeometryShape.values.length,
      previousLabel: t('previousChoice'),
      nextLabel: t('nextChoice'),
      positionLabel: (number, count) =>
          t('choicePosition', {'number': number, 'count': count}),
      reducedMotion: MediaQuery.disableAnimationsOf(context),
      cardBuilder: (context, i, width) {
        final shape = GeometryShape.values[i];
        final selected =
            (kind == GeometryCardKind.solid ? _solid : _net) == shape;
        return SizedBox(
          width: width,
          child: Semantics(
            selected: selected,
            button: true,
            enabled: active && c.canWrite,
            child: GeoMathCard(
              key: ValueKey('classroom-choice-${kind.name}-${shape.name}'),
              padding: const EdgeInsets.all(8),
              onTap: active && c.canWrite
                  ? () => setState(() {
                      if (kind == GeometryCardKind.solid) {
                        _solid = shape;
                      } else {
                        _net = shape;
                      }
                    })
                  : null,
              child: Column(
                children: [
                  GeometryCardView(
                    shape: shape,
                    kind: kind,
                    provider: widget.geometry,
                    size: 110,
                    semanticLabel:
                        '${t('choice', {'number': i + 1})} ${kind == GeometryCardKind.solid ? strings.text('shape.${shape.name}') : t('r2')}',
                  ),
                  Text(t('choice', {'number': i + 1})),
                  if (selected) const Icon(Icons.check_circle_rounded),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _answerOutcome(String? value) => value == 'correct'
      ? t('feedback')
      : value == 'skipped'
      ? t('skipped')
      : t('wrong');
  Future<void> _leaveGame() async {
    final scope = c.captureScope();
    if (await _confirm(t('leaveGame'), t('leaveConfirm')) &&
        c.isScopeCurrent(scope)) {
      c.leaveGame(expectedScope: scope);
    }
  }

  Future<void> _openRoom(ClassroomRoom room) async {
    if (!c.teacher && !room.isMember && !room.closed) {
      if (!await c.perform(
        ClassroomCommand('join_room', {'room_id': room.id}),
      )) {
        return;
      }
    }
    await c.openRoom(room.id);
  }

  Future<void> _createClass() => _input(
    t('createClass'),
    t('name'),
    help: t('nameHelp'),
    validate: ClassroomValidation.name,
    submit: (value) async {
      final saved = await c.perform(
        ClassroomCommand('create_class', {'name': value.trim()}),
      );
      if (saved) _archive = false;
      return saved;
    },
  );

  Future<void> _createRoom(ClassroomClass item) => _input(
    t('createRoom'),
    t('name'),
    help: t('nameHelp'),
    validate: ClassroomValidation.name,
    submit: (value) => c.perform(
      ClassroomCommand('create_room', {
        'class_id': item.id,
        'name': value.trim(),
      }),
    ),
  );

  Future<void> _joinPin() => _input(
    t('joinPin'),
    t('pin'),
    help: t('pinHelp'),
    numeric: true,
    validate: ClassroomValidation.pin,
    submit: (value) =>
        c.perform(ClassroomCommand('join_pin', {'pin': value.trim()})),
  );

  Future<void> _invite(ClassroomClass item) => _input(
    t('invite'),
    t('username'),
    validate: (value) =>
        RegExp(r'^[a-z0-9_]{3,24}$').hasMatch(value.toLowerCase().trim()),
    submit: (value) => c.perform(
      ClassroomCommand('invite', {
        'class_id': item.id,
        'username': value.toLowerCase().trim(),
      }),
    ),
  );

  Future<void> _input(
    String title,
    String label, {
    String? help,
    bool numeric = false,
    required bool Function(String) validate,
    required Future<bool> Function(String) submit,
  }) => showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (context) => _ClassroomInputDialog(
      controller: c,
      title: title,
      label: label,
      help: help,
      numeric: numeric,
      validate: validate,
      submit: submit,
    ),
  );

  Future<bool> _confirm(
    String title,
    String message, {
    bool danger = false,
  }) async {
    final scope = c.captureScope();
    final routeInstance = AppRouteScope.maybeOf(context)?.entry.instance;
    final yes = await showGeoMathConfirmation(
      context,
      title: title,
      message: message,
      confirmLabel: t('confirm'),
      cancelLabel: t('cancel'),
      danger: danger,
    );
    if (!mounted || !yes || !c.isScopeCurrent(scope)) return false;
    final route = AppRouteScope.maybeOf(context);
    return route?.entry.instance == routeInstance && (route?.isCurrent ?? true);
  }

  Future<void> _management() async {
    final draft = c.management;
    if (draft == null || !mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ManagementDialog(controller: c, draft: draft),
    );
    c.closeManagement();
  }

  static String _duration(int ms) =>
      '${(ms / 60000).floor().toString().padLeft(2, '0')}:${((ms ~/ 1000) % 60).toString().padLeft(2, '0')}';
  static String _date(DateTime date) =>
      date.toLocal().toString().split('.').first;
}

final class _ClassroomInputDialog extends StatefulWidget {
  const _ClassroomInputDialog({
    required this.controller,
    required this.title,
    required this.label,
    required this.validate,
    required this.submit,
    this.help,
    this.numeric = false,
  });
  final ClassroomController controller;
  final String title, label;
  final String? help;
  final bool numeric;
  final bool Function(String) validate;
  final Future<bool> Function(String) submit;
  @override
  State<_ClassroomInputDialog> createState() => _ClassroomInputDialogState();
}

final class _ClassroomInputDialogState extends State<_ClassroomInputDialog> {
  final field = TextEditingController(), form = GlobalKey<FormState>();
  final errorFocus = FocusNode();
  late final ActorBinding actor;
  bool closing = false;
  @override
  void initState() {
    super.initState();
    actor = widget.controller.sessions.current;
    widget.controller.addListener(_changed);
  }

  void _close() {
    if (closing || !mounted) return;
    closing = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  void _changed() {
    if (!mounted) return;
    if (!widget.controller.sessions.isCurrent(actor) ||
        widget.controller.denied) {
      _close();
    } else {
      setState(() {});
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_changed);
    field.dispose();
    errorFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller, s = AppStrings.of(context);
    String t(String key) => s.text('classroom.${key.replaceAll('_', '.')}');
    return PopScope(
      canPop: !c.mutating,
      child: _ClassroomFormDialog(
        key: const ValueKey('classroom-input'),
        title: Text(widget.title),
        content: SingleChildScrollView(
          child: Form(
            key: form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                LabeledField(
                  label: widget.label,
                  controller: field,
                  helperText: widget.help,
                  enabled: !c.mutating,
                  keyboardType: widget.numeric
                      ? TextInputType.number
                      : TextInputType.text,
                  inputFormatters: widget.numeric
                      ? [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ]
                      : null,
                  validator: (value) => widget.validate(value?.trim() ?? '')
                      ? null
                      : t('error.invalid_payload'),
                ),
                if (c.failure != null)
                  Focus(
                    focusNode: errorFocus,
                    child: StatusNotice(
                      message: s.text(
                        c.failure!.message.replaceAll('_', '.'),
                        fallback: t('error.generic'),
                      ),
                      tone: StatusTone.error,
                      liveRegion: true,
                    ),
                  ),
                if (c.requiresReconciliation)
                  StatusNotice(
                    message: t('uncertain'),
                    tone: StatusTone.warning,
                    liveRegion: true,
                  ),
                if (c.noticeKey == 'classroom.reconciled') ...[
                  StatusNotice(message: t('reconciled'), liveRegion: true),
                  for (final item in c.snapshot?.classes ?? <ClassroomClass>[])
                    Text(item.name),
                  for (final item in c.snapshot?.rooms ?? <ClassroomRoom>[])
                    Text(item.name),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: c.busy ? null : () => Navigator.pop(context),
            child: Text(t('cancel')),
          ),
          if (c.stale || c.requiresReconciliation)
            TextButton(
              onPressed: c.busy ? null : () => c.refresh(explicit: true),
              child: Text(t('refresh')),
            ),
          FilledButton(
            onPressed: !c.canWrite
                ? null
                : () async {
                    if (!form.currentState!.validate()) return;
                    final saved = await widget.submit(field.text);
                    if (!mounted) return;
                    if (saved) {
                      _close();
                    } else {
                      errorFocus.requestFocus();
                    }
                  },
            child: Text(t('confirm')),
          ),
        ],
      ),
    );
  }
}

final class _ManagementDialog extends StatefulWidget {
  const _ManagementDialog({required this.controller, required this.draft});
  final ClassroomController controller;
  final ClassroomManagementDraft draft;
  @override
  State<_ManagementDialog> createState() => _ManagementDialogState();
}

final class _ManagementDialogState extends State<_ManagementDialog> {
  late final TextEditingController field = TextEditingController(
    text: widget.draft.name,
  );
  final form = GlobalKey<FormState>();
  final errorFocus = FocusNode();
  bool closing = false;
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_changed);
  }

  void _changed() {
    if (!mounted) return;
    if (!identical(widget.controller.management, widget.draft)) {
      if (!closing) {
        closing = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) Navigator.of(context).pop();
        });
      }
    } else {
      setState(() {});
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_changed);
    field.dispose();
    errorFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller, d = widget.draft, s = AppStrings.of(context);
    String t(String key, [Map<String, Object> parameters = const {}]) =>
        s.text('classroom.${key.replaceAll('_', '.')}', parameters: parameters);
    final description = d.invitation
        ? 'confirmInvite'
        : d.action == 'remove_member'
        ? 'confirmRemove'
        : d.action.startsWith('archive')
        ? 'confirmArchive'
        : d.action.startsWith('restore')
        ? 'confirmRestore'
        : 'confirmDelete';
    return PopScope(
      canPop: !c.mutating,
      child: _ClassroomFormDialog(
        key: const ValueKey('classroom-management'),
        title: Text(t(d.action)),
        content: SingleChildScrollView(
          child: Form(
            key: form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(t('currentName', {'name': d.serverName})),
                const SizedBox(height: 12),
                if (d.rename)
                  LabeledField(
                    label: t('name'),
                    controller: field,
                    helperText: t('nameHelp'),
                    enabled: !c.mutating,
                    onChanged: (value) => d.name = value,
                    validator: (text) => ClassroomValidation.name(text ?? '')
                        ? null
                        : t('error.invalid_name'),
                  )
                else
                  Text(t(description)),
                if (c.failure != null) ...[
                  const SizedBox(height: 12),
                  Focus(
                    focusNode: errorFocus,
                    child: StatusNotice(
                      message: s.text(
                        c.failure!.message.replaceAll('_', '.'),
                        fallback: t('error.generic'),
                      ),
                      tone: StatusTone.error,
                      liveRegion: true,
                    ),
                  ),
                ],
                if (c.requiresReconciliation) ...[
                  const SizedBox(height: 12),
                  StatusNotice(
                    message: t('uncertain'),
                    tone: StatusTone.warning,
                  ),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: c.busy ? null : () => Navigator.pop(context),
            child: Text(t('cancel')),
          ),
          if (!d.invitation || c.requiresReconciliation)
            TextButton(
              onPressed: c.busy
                  ? null
                  : () async {
                      final ok = await c.refreshManagement();
                      if (mounted && !ok) errorFocus.requestFocus();
                    },
              child: Text(t('refresh')),
            ),
          FilledButton(
            onPressed: !c.canWrite
                ? null
                : () async {
                    if (!form.currentState!.validate()) return;
                    d.name = field.text;
                    final ok = await c.saveManagement();
                    if (mounted && !ok) errorFocus.requestFocus();
                  },
            child: Text(t(d.rename ? 'save' : 'confirm')),
          ),
        ],
      ),
    );
  }
}

/// A keyboard can leave less height than the form title and three stacked
/// actions. Keep the entire form, including its actions, in one scroll region.
final class _ClassroomFormDialog extends StatelessWidget {
  const _ClassroomFormDialog({
    required this.title,
    required this.content,
    required this.actions,
    super.key,
  });
  final Widget title, content;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) => AlertDialog(
    scrollable: true,
    contentPadding: const EdgeInsets.all(24),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: DefaultTextStyle(
            style: Theme.of(context).textTheme.headlineSmall!,
            child: title,
          ),
        ),
        const SizedBox(height: 20),
        content,
        const SizedBox(height: 24),
        OverflowBar(
          alignment: MainAxisAlignment.end,
          spacing: 8,
          overflowSpacing: 8,
          children: actions,
        ),
      ],
    ),
  );
}
