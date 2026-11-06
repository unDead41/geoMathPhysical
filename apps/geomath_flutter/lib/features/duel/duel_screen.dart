import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/app_dependencies.dart';
import '../../core/audio/audio_coordinator.dart';
import '../../core/geometry/geometry_card_provider.dart';
import '../../core/geometry/geometry_card_view.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/navigation/app_navigation.dart';
import '../../core/widgets/widgets.dart';
import 'duel_controller.dart';
import 'duel_projection.dart';
import 'presentation/game_card_carousel.dart';
import 'presentation/game_card_drag.dart';
import 'presentation/game_question_content.dart';

/// Every entry route projects the same service-owned session and poll owner.
final class DuelScreen extends StatefulWidget {
  const DuelScreen({
    super.key,
    required this.controller,
    required this.geometry,
    required this.audio,
  });
  final DuelController controller;
  final GeometryCardProvider geometry;
  final AudioCoordinator audio;
  @override
  State<DuelScreen> createState() => _DuelScreenState();
}

final class _DuelScreenState extends State<DuelScreen> {
  final _name = TextEditingController(), _pin = TextEditingController();
  GeometryShape? _selected;
  Object? _selectionStage;
  int? _instance;
  bool _currentRoute = true, _confirming = false;
  bool _clipboardBusy = false;
  int _pinEditRevision = 0;
  String? _clipboardNotice;
  Object? _clipboardScope;
  Timer? _ticker;
  DuelController get c => widget.controller;
  AppStrings get s => AppStrings.of(context);
  String t(String key, [Map<String, Object> parameters = const {}]) =>
      s.text('duel.$key', parameters: parameters);

  @override
  void initState() {
    super.initState();
    c.addListener(_changed);
    _pin.addListener(_pinEdited);
    // Display-only ticks: network polling and review advancement have one owner.
    _ticker = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (mounted && _currentRoute && c.snapshot != null) setState(() {});
    });
    unawaited(c.resume());
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  void _pinEdited() => _pinEditRevision++;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = AppRouteScope.maybeOf(context);
    _currentRoute = route?.isCurrent ?? true;
    if (_instance != route?.entry.instance) {
      if (_instance case final previous?) c.removeBackHandler(previous);
      _instance = route?.entry.instance;
      if (_instance case final instance?) {
        c.registerBackHandler(instance, _confirmLeave);
      }
    }
  }

  Future<BackDecision> _confirmLeave() async {
    if (_confirming || c.busy) return BackDecision.stay;
    if (!c.hasSession) return BackDecision.allow;
    final actor = c.actor, instance = _instance;
    final generation = c.sessionGeneration;
    _confirming = true;
    final forget = c.canForgetSession && c.snapshot?.room.terminal != true;
    if (c.needsForfeitConfirmation || forget) {
      final pause = widget.audio.pause();
      bool confirmed;
      try {
        confirmed = await showGeoMathConfirmation(
          context,
          title: t(forget ? 'forgetTitle' : 'confirmTitle'),
          message: t(forget ? 'forgetMessage' : 'confirmMessage'),
          confirmLabel: t(forget ? 'forget' : 'confirmLeave'),
          cancelLabel: t('stay'),
          danger: true,
        );
      } finally {
        await pause.release();
      }
      if (!mounted ||
          !confirmed ||
          actor != c.actor ||
          generation != c.sessionGeneration ||
          instance != _instance ||
          !_currentRoute) {
        _confirming = false;
        return BackDecision.stay;
      }
    }
    try {
      final result = await c.leave(
        confirmed: true,
        expectedGeneration: generation,
      );
      return mounted && actor == c.actor && result.isSuccess && !c.hasSession
          ? BackDecision.allow
          : BackDecision.stay;
    } finally {
      _confirming = false;
    }
  }

  void _back() {
    final app = context.dependOnInheritedWidgetOfExactType<AppScope>();
    if (app != null) {
      app.router.back();
    } else {
      unawaited(_confirmLeave());
    }
  }

  Future<void> _exit() async {
    final decision = await _confirmLeave();
    if (mounted && decision == BackDecision.allow) _back();
  }

  String _time(int milliseconds) {
    final seconds = (math.max(0, milliseconds) / 1000).ceil();
    return '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
  }

  String _shape(GeometryShape? shape) =>
      shape == null ? t('none') : s.text('shape.${shape.name}');
  int get _reviewSeconds => (c.reviewRemaining / 1000).ceil();

  Future<void> _pastePin() async {
    if (!mounted ||
        !_currentRoute ||
        c.busy ||
        _clipboardBusy ||
        c.hasSession) {
      return;
    }
    final actor = c.actor, generation = c.sessionGeneration;
    final pinRevision = _pinEditRevision;
    bool current() =>
        mounted &&
        _currentRoute &&
        c.actor == actor &&
        c.sessionGeneration == generation &&
        !c.hasSession;
    setState(() {
      _clipboardBusy = true;
      _clipboardNotice = null;
    });
    try {
      final text = (await Clipboard.getData(Clipboard.kTextPlain))?.text ?? '';
      // A newer field edit supersedes the pending paste, even if the player
      // subsequently restores the same text that was present when it began.
      if (!current() || _pinEditRevision != pinRevision) return;
      // Accept the PIN alone or the one public PIN in a copied invitation.
      // Never truncate a longer number into a different room's PIN.
      final matches = RegExp(r'\b\d{6}\b').allMatches(text).toList();
      if (matches.length != 1) {
        setState(() => _clipboardNotice = 'clipboardInvalid');
        return;
      }
      _pin.value = TextEditingValue(
        text: matches.single[0]!,
        selection: const TextSelection.collapsed(offset: 6),
      );
      setState(() => _clipboardNotice = 'pinPasted');
    } catch (_) {
      if (current() && _pinEditRevision == pinRevision) {
        setState(() => _clipboardNotice = 'clipboardError');
      }
    } finally {
      if (mounted) setState(() => _clipboardBusy = false);
    }
  }

  Future<void> _copyPin(
    DuelSnapshot snapshot, {
    bool invitation = false,
  }) async {
    if (!mounted ||
        _clipboardBusy ||
        !_currentRoute ||
        c.snapshot?.room.id != snapshot.room.id) {
      return;
    }
    final actor = c.actor, generation = c.sessionGeneration;
    bool current() =>
        mounted &&
        _currentRoute &&
        c.actor == actor &&
        c.sessionGeneration == generation &&
        c.snapshot?.room.id == snapshot.room.id;
    setState(() {
      _clipboardBusy = true;
      _clipboardNotice = null;
    });
    try {
      await Clipboard.setData(
        ClipboardData(
          text: invitation
              ? t('invitation', {'pin': snapshot.room.code})
              : snapshot.room.code,
        ),
      );
      if (current()) {
        setState(
          () =>
              _clipboardNotice = invitation ? 'invitationCopied' : 'pinCopied',
        );
      }
    } catch (_) {
      if (current()) setState(() => _clipboardNotice = 'clipboardError');
    } finally {
      if (mounted) setState(() => _clipboardBusy = false);
    }
  }

  Widget _clipboardStatus() => StatusNotice(
    key: const ValueKey('duel-clipboard-status'),
    message: t(_clipboardNotice!),
    tone:
        _clipboardNotice == 'clipboardError' ||
            _clipboardNotice == 'clipboardInvalid'
        ? StatusTone.warning
        : StatusTone.success,
    liveRegion: true,
  );

  @override
  Widget build(BuildContext context) {
    final snapshot = c.snapshot;
    final clipboardScope = (c.actor, c.sessionGeneration, snapshot?.room.id);
    if (_clipboardScope != clipboardScope) {
      _clipboardScope = clipboardScope;
      _clipboardNotice = null;
    }
    final stage = (
      c.actor,
      c.sessionGeneration,
      snapshot?.room.id,
      snapshot?.currentQuestion?.index,
      snapshot?.me.stage,
    );
    if (_selectionStage != stage) {
      _selectionStage = stage;
      _selected = null;
    }
    return GeoMathScaffold(
      title: t('title'),
      subtitle: snapshot == null ? t('intro') : null,
      showBackButton: true,
      onBack: _back,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!c.configured)
            StatusNotice(
              key: const ValueKey('duel-unavailable'),
              title: t('unavailableTitle'),
              message: t('unavailable'),
              tone: StatusTone.neutral,
            )
          else if (!c.initialized && c.failure == null)
            StatusNotice(message: t('loading'))
          else ...[
            if (c.failure != null ||
                c.pending ||
                (c.hasSession && snapshot == null)) ...[
              _connection(),
              const SizedBox(height: 16),
            ],
            if (snapshot == null && !c.hasSession)
              _entry()
            else if (snapshot == null)
              StatusNotice(message: t('pending'), liveRegion: true)
            else if (snapshot.reviewPending)
              _review(snapshot)
            else if (snapshot.room.status == DuelRoomStatus.waiting ||
                snapshot.room.status == DuelRoomStatus.countdown)
              _lobby(snapshot)
            else if (snapshot.currentQuestion != null)
              _match(snapshot)
            else
              _result(snapshot),
          ],
          if (c.hasSession) ...[
            const SizedBox(height: 20),
            ActionButton(
              key: const ValueKey('duel-forfeit'),
              label: t(
                c.canForgetSession && snapshot?.room.terminal != true
                    ? 'forget'
                    : snapshot?.room.terminal == true
                    ? 'close'
                    : 'exit',
              ),
              kind: ActionButtonKind.secondary,
              onPressed: c.busy ? null : () => unawaited(_exit()),
            ),
          ],
        ],
      ),
    );
  }

  Widget _connection() {
    final seconds = (c.retryRemaining.inMilliseconds / 1000).ceil();
    return RetryPanel(
      key: const ValueKey('duel-connection'),
      title: t('connection'),
      message: c.pending
          ? t('pending')
          : s.text('duel.error.${c.errorCode}', fallback: t('errorGeneric')),
      retryLabel: seconds > 0
          ? t('retryAfter', {'seconds': seconds})
          : t('retry'),
      busy: c.busy,
      onRetry: seconds > 0 || c.protocolStopped
          ? null
          : () => unawaited(c.resume()),
    );
  }

  Widget _entry() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      StatusNotice(message: t('rules')),
      const SizedBox(height: 12),
      Text(t('guest')),
      const SizedBox(height: 20),
      LabeledField(
        key: const ValueKey('duel-name'),
        label: t('name'),
        controller: _name,
        helperText: t('nameHint'),
        maxLength: 60,
        enabled: !c.busy,
        textInputAction: TextInputAction.next,
        keyboardType: TextInputType.name,
      ),
      const SizedBox(height: 12),
      ActionButton(
        key: const ValueKey('duel-create'),
        label: t('create'),
        icon: Icons.add_rounded,
        busy: c.busy,
        onPressed: c.busy ? null : () => unawaited(c.create(_name.text)),
      ),
      const SizedBox(height: 24),
      SectionHeader(title: t('orJoin')),
      const SizedBox(height: 12),
      LabeledField(
        key: const ValueKey('duel-pin'),
        label: t('pin'),
        controller: _pin,
        helperText: t('pinHint'),
        maxLength: 6,
        enabled: !c.busy,
        keyboardType: TextInputType.number,
        textInputAction: TextInputAction.done,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      ),
      const SizedBox(height: 12),
      ActionButton(
        key: const ValueKey('duel-paste-pin'),
        label: t('pastePin'),
        kind: ActionButtonKind.tonal,
        icon: Icons.content_paste_rounded,
        onPressed: c.busy || _clipboardBusy
            ? null
            : () => unawaited(_pastePin()),
      ),
      if (_clipboardNotice != null) ...[
        const SizedBox(height: 12),
        _clipboardStatus(),
      ],
      const SizedBox(height: 12),
      ActionButton(
        key: const ValueKey('duel-join'),
        label: t('join'),
        kind: ActionButtonKind.secondary,
        busy: c.busy,
        onPressed: c.busy
            ? null
            : () => unawaited(c.join(_name.text, _pin.text)),
      ),
    ],
  );

  Widget _players(DuelSnapshot snapshot) => Wrap(
    spacing: 12,
    runSpacing: 12,
    children: [
      for (final player in [
        snapshot.me,
        if (snapshot.opponent != null) snapshot.opponent!,
      ])
        GeoMathCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(player.name, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 6),
              Text(t('player', {'slot': player.slot})),
              const SizedBox(height: 6),
              SyncStatusBadge(
                label: t(player.ready ? 'ready' : 'notReady'),
                tone: player.ready ? StatusTone.success : StatusTone.neutral,
              ),
              const SizedBox(height: 6),
              Text(t('score', {'score': player.score})),
              Text(t('progress', {'answered': player.answered})),
            ],
          ),
        ),
      if (snapshot.opponent == null)
        GeoMathCard(child: Text(t('waitingFriend'))),
    ],
  );
  Widget _lobby(DuelSnapshot snapshot) => Column(
    key: const ValueKey('duel-lobby'),
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SectionHeader(title: t('lobby'), subtitle: t('sharePin')),
      const SizedBox(height: 16),
      GeoMathCard(
        child: Column(
          children: [
            SelectableText(
              snapshot.room.code,
              key: const ValueKey('duel-room-pin'),
              semanticsLabel:
                  '${t('pin')} ${snapshot.room.code.split('').join(' ')}',
              style: Theme.of(context).textTheme.displayMedium,
            ),
            const SizedBox(height: 8),
            Text(
              t('pinExpires', {
                'time': _time(
                  snapshot.room.lobbyExpiresAt - c.serverMilliseconds,
                ),
              }),
            ),
            const SizedBox(height: 16),
            Text(t('joinInstructions'), textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ActionButton(
              key: const ValueKey('duel-copy-pin'),
              label: t('copyPin'),
              kind: ActionButtonKind.secondary,
              icon: Icons.copy_rounded,
              onPressed: _clipboardBusy
                  ? null
                  : () => unawaited(_copyPin(snapshot)),
            ),
            const SizedBox(height: 8),
            ActionButton(
              key: const ValueKey('duel-copy-invitation'),
              label: t('copyInvitation'),
              kind: ActionButtonKind.tonal,
              icon: Icons.person_add_alt_1_outlined,
              onPressed: _clipboardBusy
                  ? null
                  : () => unawaited(_copyPin(snapshot, invitation: true)),
            ),
            if (_clipboardNotice != null) ...[
              const SizedBox(height: 12),
              _clipboardStatus(),
            ],
          ],
        ),
      ),
      const SizedBox(height: 16),
      _players(snapshot),
      const SizedBox(height: 16),
      StatusNotice(
        key: const ValueKey('duel-lobby-status'),
        title: t('readyCount', {
          'count': [
            snapshot.me,
            ?snapshot.opponent,
          ].where((player) => player.ready).length,
        }),
        message: t(
          c.pending
              ? 'pending'
              : !c.connected
              ? 'reconnecting'
              : snapshot.room.status == DuelRoomStatus.countdown
              ? 'bothReady'
              : snapshot.opponent == null
              ? 'waitingFriend'
              : snapshot.me.ready
              ? 'waitingReady'
              : 'readyPrompt',
        ),
        tone: c.pending || !c.connected ? StatusTone.warning : StatusTone.info,
        liveRegion: true,
      ),
      const SizedBox(height: 16),
      if (snapshot.room.status == DuelRoomStatus.countdown)
        StatusNotice(
          key: const ValueKey('duel-countdown'),
          liveRegion: true,
          message: t('countdown', {
            'seconds':
                (math.max(0, snapshot.room.startsAt! - c.serverMilliseconds) /
                        1000)
                    .ceil(),
          }),
        )
      else
        ActionButton(
          key: const ValueKey('duel-ready'),
          label: t(snapshot.me.ready ? 'ready' : 'readyAction'),
          busy: c.busy,
          onPressed: c.connected && !c.pending && !snapshot.me.ready
              ? () => unawaited(c.ready())
              : null,
        ),
      const SizedBox(height: 12),
      Text(t('readyNote')),
      const SizedBox(height: 12),
      Text(t('liveNote')),
    ],
  );

  /// Uses only the server's public copy and optional variable legend. Active
  /// question IDs and the local Solo bank never determine question content.
  Widget _questionContent(DuelQuestion question, {TextStyle? style}) {
    final language = s.locale.languageCode;
    final copy = question.localized(language);
    // The real projector joins its LCD lines into prompt. Preserve any extra
    // public lines without displaying the same formula and context twice.
    final text = [
      copy.prompt,
      ...copy.lines.where((line) => !copy.prompt.contains(line)),
    ].join('\n');
    return GameQuestionContent(
      text: text,
      languageCode: language,
      formulaKey: question.formulaKey[language],
      style: style,
    );
  }

  Widget _match(DuelSnapshot snapshot) {
    final question = snapshot.currentQuestion!;
    final copy = question.localized(s.locale.languageCode);
    final actor = c.actor, generation = c.sessionGeneration;
    final scope = (
      actor,
      generation,
      snapshot.room.id,
      question.index,
      snapshot.me.stage,
    );
    final left = snapshot.room.deadlineAt! - c.serverMilliseconds;
    // Recheck at the gesture boundary as well as while building. A callback
    // from a prior route/session/stage cannot scan the controller's new state.
    bool canAnswer() =>
        mounted &&
        _currentRoute &&
        c.actor == actor &&
        c.sessionGeneration == generation &&
        identical(c.snapshot, snapshot) &&
        c.canAnswer &&
        snapshot.room.deadlineAt! > c.serverMilliseconds;
    void choose(GeometryShape shape) {
      if (!canAnswer()) return;
      if (_selected != shape) unawaited(GeoFeedback.selection(context));
      setState(() => _selected = shape);
    }

    return Column(
      key: const ValueKey('duel-question'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          title: t('question', {'number': snapshot.me.answered + 1}),
          trailing: SyncStatusBadge(
            key: const ValueKey('duel-clock'),
            label: left <= 0
                ? t('deadline')
                : t('remaining', {'time': _time(left)}),
          ),
        ),
        const SizedBox(height: 12),
        _players(snapshot),
        const SizedBox(height: 16),
        GeoMathCard(
          child: _questionContent(
            question,
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
        if (copy.hint case final hint?) ...[
          const SizedBox(height: 12),
          StatusNotice(title: t('hintTitle'), message: hint),
        ],
        const SizedBox(height: 20),
        SectionHeader(
          title: t(
            snapshot.me.stage == GeometryCardKind.solid
                ? 'solidStage'
                : 'netStage',
          ),
          subtitle: t('choose'),
        ),
        const SizedBox(height: 12),
        GameCardCarousel(
          scopeKey: scope,
          keyPrefix: 'duel-cards',
          itemCount: GeometryShape.values.length,
          previousLabel: t('previousCard'),
          nextLabel: t('nextCard'),
          positionLabel: (index, count) =>
              t('cardPosition', {'index': index, 'count': count}),
          reducedMotion: MediaQuery.disableAnimationsOf(context),
          cardBuilder: (context, index, width) {
            final shape = GeometryShape.values[index];
            return GameCardDraggable(
              data: GameCardDragData(
                scopeKey: scope,
                shape: shape,
                kind: snapshot.me.stage,
              ),
              enabled: canAnswer(),
              label: _shape(shape),
              child: Semantics(
                selected: _selected == shape,
                child: GeoMathCard(
                  key: ValueKey('duel-card-${shape.name}'),
                  padding: const EdgeInsets.all(10),
                  color: _selected == shape
                      ? Theme.of(context).colorScheme.primaryContainer
                      : null,
                  onTap: canAnswer() ? () => choose(shape) : null,
                  semanticLabel:
                      '${_shape(shape)}, ${t(snapshot.me.stage == GeometryCardKind.solid ? 'solidStage' : 'netStage')}',
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GeometryCardView(
                        shape: shape,
                        kind: snapshot.me.stage,
                        provider: widget.geometry,
                        size: math.min(110, width - 20),
                        semanticLabel: _shape(shape),
                      ),
                      const SizedBox(height: 8),
                      Text(_shape(shape), textAlign: TextAlign.center),
                      const SizedBox(height: 6),
                      // Reserve selection space so choosing never shifts the
                      // scan control or changes the carousel's height.
                      SizedBox(
                        height: 24,
                        child: _selected == shape
                            ? Icon(
                                Icons.check_circle_rounded,
                                color: Theme.of(context).colorScheme.primary,
                              )
                            : null,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        GameReaderTarget(
          key: ValueKey(
            'duel-reader-${snapshot.me.stage == GeometryCardKind.solid ? 'r1' : 'r2'}',
          ),
          scopeKey: scope,
          kind: snapshot.me.stage,
          active: true,
          canSelect: canAnswer,
          onSelected: choose,
          title: t('activeReader', {
            'reader': snapshot.me.stage == GeometryCardKind.solid ? 'R1' : 'R2',
          }),
          message: t('dropHere'),
          selection: _selected == null
              ? null
              : t('selection', {'shape': _shape(_selected)}),
          child: ActionButton(
            key: const ValueKey('duel-scan'),
            label: t('check'),
            busy: c.busy,
            onPressed: canAnswer() && _selected != null
                ? () {
                    final selected = _selected;
                    if (canAnswer() && selected != null) {
                      unawaited(c.scan(selected, kind: snapshot.me.stage));
                    }
                  }
                : null,
          ),
        ),
        const SizedBox(height: 10),
        ActionButton(
          key: const ValueKey('duel-hint'),
          label: t('hint'),
          kind: ActionButtonKind.secondary,
          onPressed: canAnswer() && !snapshot.hintUsed
              ? () {
                  if (canAnswer()) unawaited(c.hint());
                }
              : null,
        ),
        const SizedBox(height: 10),
        ActionButton(
          key: const ValueKey('duel-skip'),
          label: t('skip'),
          kind: ActionButtonKind.secondary,
          onPressed: canAnswer()
              ? () {
                  if (canAnswer()) unawaited(c.skip());
                }
              : null,
        ),
        const SizedBox(height: 12),
        Text(t('liveNote')),
      ],
    );
  }

  Widget _review(DuelSnapshot snapshot) {
    final answer = snapshot.review!, shape = answer.question.settledShape!;
    return Column(
      key: const ValueKey('duel-review'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StatusNotice(
          title: t(answer.outcome.name),
          message: t('reviewNote'),
          tone: answer.outcome == DuelOutcome.correct
              ? StatusTone.success
              : StatusTone.warning,
          liveRegion: true,
        ),
        const SizedBox(height: 16),
        GeoMathCard(
          child: _questionContent(
            answer.question,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        const SizedBox(height: 12),
        Text(t('correctShape', {'shape': _shape(shape)})),
        const SizedBox(height: 12),
        Wrap(
          spacing: 16,
          runSpacing: 12,
          children: [
            for (final kind in GeometryCardKind.values)
              GeoMathCard(
                child: GeometryCardView(
                  shape: shape,
                  kind: kind,
                  provider: widget.geometry,
                  semanticLabel:
                      '${_shape(shape)} ${kind == GeometryCardKind.solid ? t('solidStage') : t('netStage')}',
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Text(t('yourSolid', {'shape': _shape(answer.attempts.solid)})),
        Text(t('yourNet', {'shape': _shape(answer.attempts.net)})),
        const SizedBox(height: 16),
        if (answer.outcome == DuelOutcome.correct)
          StatusNotice(
            message: _reviewSeconds > 0
                ? t('reviewGate', {'seconds': _reviewSeconds})
                : t('autoAdvance'),
          )
        else
          ActionButton(
            key: const ValueKey('duel-continue'),
            label: _reviewSeconds > 0
                ? t('reviewGate', {'seconds': _reviewSeconds})
                : t('continue'),
            busy: c.busy,
            onPressed: c.canContinue ? () => unawaited(c.advance()) : null,
          ),
        const SizedBox(height: 12),
        Text(t('liveNote')),
      ],
    );
  }

  Widget _result(DuelSnapshot snapshot) {
    final room = snapshot.room;
    final title = switch (room.status) {
      DuelRoomStatus.cancelled => t('cancelled'),
      DuelRoomStatus.expired => t('expired'),
      DuelRoomStatus.complete =>
        room.winnerId == null
            ? t('tie')
            : room.winnerId == snapshot.me.id
            ? t('youWin')
            : t('friendWins', {'name': snapshot.opponent?.name ?? ''}),
      _ => t('finished'),
    };
    return Column(
      key: const ValueKey('duel-result'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: t('result'), subtitle: title),
        const SizedBox(height: 16),
        if (!room.terminal) ...[
          StatusNotice(message: t('waitingResult')),
          const SizedBox(height: 12),
        ],
        _players(snapshot),
        const SizedBox(height: 12),
        GeoMathCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                t('score', {'score': snapshot.me.score}),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(t('elapsed', {'time': _time(snapshot.me.elapsed)})),
              Text(t('mistakes', {'count': snapshot.me.mistakes})),
              Text(t('skips', {'count': snapshot.me.skipped})),
              Text(t('hints', {'count': snapshot.me.hints})),
            ],
          ),
        ),
        if (snapshot.answers.isNotEmpty) ...[
          const SizedBox(height: 20),
          SectionHeader(title: t('answers')),
          for (final answer in snapshot.answers) ...[
            const SizedBox(height: 8),
            GeoMathCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t('question', {'number': answer.question.index + 1})),
                  _questionContent(answer.question),
                  Text(
                    '${t(answer.outcome.name)} · ${_shape(answer.question.settledShape)}',
                  ),
                ],
              ),
            ),
          ],
        ],
      ],
    );
  }

  @override
  void dispose() {
    _ticker?.cancel();
    c.removeListener(_changed);
    if (_instance case final instance?) c.removeBackHandler(instance);
    _name.dispose();
    _pin.removeListener(_pinEdited);
    _pin.dispose();
    super.dispose();
  }
}
