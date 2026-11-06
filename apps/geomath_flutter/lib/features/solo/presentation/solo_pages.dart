import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/geometry/geometry_card_provider.dart';
import '../../../core/geometry/geometry_card_view.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/navigation/app_navigation.dart';
import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/widgets/widgets.dart';
import '../../duel/presentation/game_card_carousel.dart';
import '../../duel/presentation/game_card_drag.dart';
import '../../duel/presentation/game_question_content.dart';
import '../data/solo_repository.dart';
import '../domain/solo_bank.dart';
import '../domain/solo_game.dart';
import '../solo_controller.dart';
import 'solo_strings.dart';

String _text(
  BuildContext context,
  String key, [
  Map<String, Object> parameters = const {},
]) => AppStrings.of(context).text('solo.$key', parameters: parameters);
String _time(num milliseconds) {
  final seconds = (milliseconds / 1000).floor().clamp(0, 999999);
  return '${(seconds ~/ 60).toString().padLeft(2, '0')}:${(seconds % 60).toString().padLeft(2, '0')}';
}

Widget _gap() => const SizedBox(height: 16);
Widget _failure(BuildContext context, SoloController c, VoidCallback retry) =>
    RetryPanel(
      key: const ValueKey('solo-error'),
      title: _text(context, 'retry'),
      message: _text(context, switch (c.failure?.code) {
        FailureCode.invalid => 'invalid',
        FailureCode.stale => 'stale',
        FailureCode.conflict => 'conflict',
        FailureCode.storage => 'storage',
        _ => 'unavailable',
      }),
      retryLabel: _text(context, 'retry'),
      onRetry: retry,
    );
Future<bool> _confirmReplace(BuildContext context) => showGeoMathConfirmation(
  context,
  title: _text(context, 'replaceTitle'),
  message: _text(context, 'replaceBody'),
  confirmLabel: _text(context, 'replace'),
  cancelLabel: _text(context, 'cancel'),
  danger: true,
);

final class SoloPlayPage extends StatefulWidget {
  const SoloPlayPage({required this.controller, super.key});
  final SoloController controller;
  @override
  State<SoloPlayPage> createState() => _SoloPlayPageState();
}

final class _SoloPlayPageState extends State<SoloPlayPage> {
  final name = TextEditingController();
  final form = GlobalKey<FormState>();
  SoloMode mode = SoloMode.quiz;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(widget.controller.initialize());
    });
  }

  Future<void> _start() async {
    if (!form.currentState!.validate()) return;
    final c = widget.controller;
    var confirmed = false;
    if (c.savedSlot != null || c.failure?.code == FailureCode.invalid) {
      confirmed = await _confirmReplace(context);
      if (!confirmed || !mounted) return;
    }
    if (await c.start(
          name: name.text,
          mode: mode,
          replaceConfirmed: confirmed,
        ) &&
        mounted) {
      AppScope.of(context).router.open('solo-game');
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final c = widget.controller;
      final routes = AppScope.of(context).dependencies.composition.routes;
      return GeoMathScaffold(
        title: _text(context, 'title'),
        subtitle: _text(context, 'intro'),
        body: Form(
          key: form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GeoMathCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    LabeledField(
                      key: const ValueKey('solo-name'),
                      label: _text(context, 'name'),
                      controller: name,
                      maxLength: 60,
                      validator: (value) =>
                          (value?.trim().length ?? 0) < 2 ||
                              (value?.length ?? 0) > 60
                          ? _text(context, 'nameError')
                          : null,
                    ),
                    _gap(),
                    ChoiceChips<SoloMode>(
                      key: const ValueKey('solo-mode'),
                      options: [
                        ChoiceChipOption(
                          value: SoloMode.quiz,
                          label: _text(context, 'quiz'),
                        ),
                        ChoiceChipOption(
                          value: SoloMode.practice,
                          label: _text(context, 'practice'),
                        ),
                      ],
                      selected: mode,
                      onSelected: (value) => setState(() => mode = value),
                      enabled: !c.busy,
                    ),
                    _gap(),
                    Text(
                      _text(
                        context,
                        mode == SoloMode.quiz ? 'quizNote' : 'practiceNote',
                      ),
                    ),
                    _gap(),
                    ActionButton(
                      key: const ValueKey('solo-start'),
                      label: _text(context, 'start'),
                      icon: Icons.play_arrow_rounded,
                      onPressed: c.loading || c.bank == null ? null : _start,
                      busy: c.busy,
                    ),
                  ],
                ),
              ),
              _gap(),
              StatusNotice(message: _text(context, 'rules')),
              if (c.loading)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                ),
              if (c.failure != null) ...[
                _gap(),
                _failure(context, c, () => unawaited(c.initialize())),
              ],
              _gap(),
              ActionButton(
                key: const ValueKey('solo-resume'),
                label: _text(context, 'resume'),
                kind: ActionButtonKind.secondary,
                icon: Icons.history_rounded,
                onPressed: () =>
                    AppScope.of(context).router.open('solo-resume'),
              ),
              _gap(),
              ActionButton(
                key: const ValueKey('solo-scores'),
                label: _text(context, 'scores'),
                kind: ActionButtonKind.secondary,
                icon: Icons.emoji_events_outlined,
                onPressed: () =>
                    AppScope.of(context).router.open('solo-scores'),
              ),
              if (routes.contains('cloud-game-duel')) ...[
                _gap(),
                ActionButton(
                  key: const ValueKey('solo-duel'),
                  label: _text(context, 'duel'),
                  kind: ActionButtonKind.secondary,
                  icon: Icons.people_outline_rounded,
                  onPressed: () =>
                      AppScope.of(context).router.open('cloud-game-duel'),
                ),
              ],
              if (routes.contains('sync.pending')) ...[
                _gap(),
                ActionButton(
                  key: const ValueKey('solo-sync'),
                  label: _text(context, 'sync'),
                  kind: ActionButtonKind.secondary,
                  icon: Icons.sync_rounded,
                  onPressed: () =>
                      AppScope.of(context).router.open('sync.pending'),
                ),
              ],
              _gap(),
              ActionButton(
                label: _text(context, 'guide'),
                kind: ActionButtonKind.tonal,
                onPressed: () => AppScope.of(context).router.open('guide'),
              ),
            ],
          ),
        ),
      );
    },
  );
  @override
  void dispose() {
    name.dispose();
    super.dispose();
  }
}

final class SoloResumePage extends StatefulWidget {
  const SoloResumePage({required this.controller, super.key});
  final SoloController controller;
  @override
  State<SoloResumePage> createState() => _SoloResumePageState();
}

final class _SoloResumePageState extends State<SoloResumePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(widget.controller.initialize());
    });
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final c = widget.controller, slot = c.savedSlot;
      final state = slot?.game['state'] as Map?;
      return GeoMathScaffold(
        title: _text(context, 'resumeTitle'),
        subtitle: _text(context, 'resumeNote'),
        onBack: AppScope.of(context).router.back,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (c.loading)
              const Center(child: CircularProgressIndicator())
            else if (c.failure != null)
              _failure(context, c, () => unawaited(c.initialize()))
            else if (slot == null)
              EmptyState(
                title: _text(context, 'empty'),
                message: _text(context, 'resumeNote'),
              )
            else
              GeoMathCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      ((slot.game['player'] as Map)['name'] as String),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    _gap(),
                    Text(
                      _text(context, 'question', {
                        'number': ((state!['answers'] as List).length),
                        'total': (state['question_ids'] as List).length,
                      }),
                    ),
                    _gap(),
                    LinearProgressIndicator(
                      value:
                          (state['answers'] as List).length /
                          (state['question_ids'] as List).length,
                      semanticsLabel: _text(context, 'resume'),
                    ),
                    _gap(),
                    Text(
                      '${_text(context, 'time')}: ${_time(slot.game['elapsed'] as num)}',
                    ),
                    _gap(),
                    ActionButton(
                      key: const ValueKey('solo-resume-continue'),
                      label: _text(context, 'resumeContinue'),
                      onPressed: () async {
                        if (await c.resumeSaved() && context.mounted) {
                          AppScope.of(context).router.open('solo-game');
                        }
                      },
                    ),
                  ],
                ),
              ),
            if (slot != null || c.failure?.code == FailureCode.invalid) ...[
              _gap(),
              ActionButton(
                key: const ValueKey('solo-discard'),
                label: _text(context, 'discard'),
                kind: ActionButtonKind.secondary,
                onPressed: () async {
                  if (await _confirmReplace(context)) await c.discard();
                },
              ),
            ],
            _gap(),
            ActionButton(
              label: _text(context, 'back'),
              kind: ActionButtonKind.secondary,
              onPressed: AppScope.of(context).router.back,
            ),
          ],
        ),
      );
    },
  );
}

final class SoloGamePage extends StatefulWidget {
  const SoloGamePage({
    required this.controller,
    required this.geometry,
    super.key,
  });
  final SoloController controller;
  final GeometryCardProvider geometry;
  @override
  State<SoloGamePage> createState() => _SoloGamePageState();
}

final class _SoloGamePageState extends State<SoloGamePage> {
  Timer? timer;
  bool visible = true;
  int lastCheckpoint = 0;
  @override
  void initState() {
    super.initState();
    timer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      if (!visible) return;
      widget.controller.tick();
      if (widget.controller.now - lastCheckpoint >= 5000) {
        lastCheckpoint = widget.controller.now;
        unawaited(widget.controller.checkpoint());
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final current = AppRouteScope.maybeOf(context)?.isCurrent ?? true;
    if (visible && !current) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.controller.pause();
      });
    }
    visible = current;
  }

  String prompt(SoloQuestion q, bool english) =>
      english ? (englishQuestions[q.id]?.$1 ?? q.prompt) : q.prompt;
  String hint(SoloQuestion q, bool english) =>
      english ? (englishQuestions[q.id]?.$2 ?? q.hint) : q.hint;
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final c = widget.controller, g = c.game;
      if (g == null) {
        return GeoMathScaffold(
          title: _text(context, 'title'),
          body: EmptyState(
            title: _text(context, 'empty'),
            message: _text(context, 'stale'),
            action: ActionButton(
              label: _text(context, 'back'),
              onPressed: AppScope.of(context).router.back,
            ),
          ),
        );
      }
      if (g.status == SoloStatus.finished) return _result(context, c, g);
      final english = AppStrings.of(context).locale.languageCode == 'en';
      final actor = c.actor, attempt = c.attemptId;
      final question = g.question.id, stage = g.stage;
      final scope = (actor, attempt, question, stage);
      bool canSelect() =>
          mounted &&
          visible &&
          c.actor == actor &&
          c.sessions.isCurrent(actor) &&
          c.attemptId == attempt &&
          identical(c.game, g) &&
          g.question.id == question &&
          g.stage == stage &&
          g.interactive;
      return GeoMathScaffold(
        title: _text(context, 'question', {
          'number': g.index + 1,
          'total': g.total,
        }),
        onBack: AppScope.of(context).router.back,
        actions: [
          IconButton(
            key: const ValueKey('solo-pause'),
            tooltip: _text(context, 'pause'),
            onPressed: c.pause,
            icon: const Icon(Icons.pause_rounded),
          ),
        ],
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                Text(
                  _text(context, 'score', {'score': g.score, 'total': g.total}),
                ),
                Text('${_text(context, 'time')}: ${_time(g.time(c.now))}'),
              ],
            ),
            _gap(),
            LinearProgressIndicator(
              value: g.index / g.total,
              semanticsLabel: _text(context, 'question', {
                'number': g.index + 1,
                'total': g.total,
              }),
            ),
            _gap(),
            GeoMathCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _text(context, 'topic.${g.question.topic}'),
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  GameQuestionContent(
                    key: const ValueKey('solo-question-content'),
                    text: prompt(g.question, english),
                    languageCode: english ? 'en' : 'ms',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ],
              ),
            ),
            if (g.paused) ...[
              _gap(),
              StatusNotice(
                message: _text(context, 'paused'),
                action: ActionButton(
                  key: const ValueKey('solo-unpause'),
                  label: _text(context, 'continuePlay'),
                  onPressed: c.resume,
                ),
              ),
            ],
            Visibility(
              visible: g.interactive,
              maintainState: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _gap(),
                  SectionHeader(
                    title: _text(
                      context,
                      g.stage == GeometryCardKind.solid
                          ? 'stepSolid'
                          : 'stepNet',
                    ),
                    subtitle: _text(context, 'choose'),
                  ),
                  _gap(),
                  _choices(context, c, g, scope, canSelect),
                  _gap(),
                  _reader(
                    context,
                    c,
                    g,
                    GeometryCardKind.solid,
                    scope,
                    canSelect,
                  ),
                  _gap(),
                  _reader(
                    context,
                    c,
                    g,
                    GeometryCardKind.net,
                    scope,
                    canSelect,
                  ),
                  _gap(),
                  ActionButton(
                    key: const ValueKey('solo-hint'),
                    label: _text(context, g.hintOpen ? 'hideHint' : 'hint'),
                    kind: ActionButtonKind.tonal,
                    onPressed: () {
                      if (canSelect()) c.hint();
                    },
                  ),
                  if (g.hintOpen) ...[
                    _gap(),
                    StatusNotice(message: hint(g.question, english)),
                  ],
                  _gap(),
                  ActionButton(
                    key: const ValueKey('solo-skip'),
                    label: _text(context, 'skip'),
                    kind: ActionButtonKind.secondary,
                    onPressed: () {
                      if (canSelect()) c.skip();
                    },
                  ),
                ],
              ),
            ),
            if (g.status == SoloStatus.feedback || g.reviewing) ...[
              _gap(),
              StatusNotice(
                key: const ValueKey('solo-feedback'),
                message: _text(context, g.lastOutcome!),
                liveRegion: true,
                tone: g.lastOutcome == 'correct'
                    ? StatusTone.success
                    : StatusTone.warning,
              ),
              if (g.reviewing) ...[
                _gap(),
                Text(
                  _text(context, 'answer', {
                    'shape': AppStrings.of(context)
                        .text('shape.${g.question.shape.name}'),
                  }),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                _gap(),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 24,
                  children: [
                    for (final kind in GeometryCardKind.values)
                      GeometryCardView(
                        shape: g.question.shape,
                        kind: kind,
                        provider: widget.geometry,
                        semanticLabel: _text(context, kind.name),
                        size: 120,
                      ),
                  ],
                ),
                _gap(),
                Text(_text(context, 'reviewWait')),
                _gap(),
                ActionButton(
                  key: const ValueKey('solo-continue'),
                  label: _text(context, 'continue'),
                  onPressed: g.reviewReady(c.now) ? c.continueReview : null,
                ),
              ],
            ],
            _gap(),
            _saveStatus(context, c),
            _gap(),
            ActionButton(
              key: const ValueKey('solo-save'),
              label: _text(context, 'save'),
              kind: ActionButtonKind.secondary,
              onPressed: () => unawaited(c.checkpoint()),
            ),
          ],
        ),
      );
    },
  );
  Widget _choices(
    BuildContext context,
    SoloController c,
    SoloGame g,
    Object scope,
    bool Function() canSelect,
  ) {
    final order = g.stage == GeometryCardKind.solid ? g.solidOrder : g.netOrder;
    return GameCardCarousel(
      scopeKey: scope,
      keyPrefix: 'solo-cards',
      itemCount: order.length,
      previousLabel: _text(context, 'previousCard'),
      nextLabel: _text(context, 'nextCard'),
      positionLabel: (number, total) =>
          _text(context, 'cardPosition', {'number': number, 'total': total}),
      reducedMotion: MediaQuery.disableAnimationsOf(context),
      cardBuilder: (context, i, cardWidth) => GameCardDraggable(
        data: GameCardDragData(scopeKey: scope, shape: order[i], kind: g.stage),
        enabled: canSelect(),
        label: '${_text(context, g.stage.name)} ${String.fromCharCode(65 + i)}',
        child: Semantics(
          selected: c.selected == order[i],
          button: true,
          label:
              '${_text(context, g.stage.name)} ${String.fromCharCode(65 + i)}',
          child: GeoMathCard(
            key: ValueKey('solo-choice-${g.stage.name}-${order[i].name}'),
            padding: const EdgeInsets.all(10),
            color: c.selected == order[i]
                ? Theme.of(context).colorScheme.primaryContainer
                : null,
            onTap: canSelect()
                ? () {
                    _choose(c, order[i], canSelect);
                  }
                : null,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ExcludeSemantics(
                  child: GeometryCardView(
                    shape: order[i],
                    kind: g.stage,
                    provider: widget.geometry,
                    semanticLabel: '',
                    size: (cardWidth - 32).clamp(88.0, 128.0).toDouble(),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${_text(context, g.stage.name)} ${String.fromCharCode(65 + i)}',
                  textAlign: TextAlign.center,
                ),
                SizedBox(
                  height: 24,
                  child: c.selected == order[i]
                      ? const Icon(Icons.check_circle_outline_rounded)
                      : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _choose(
    SoloController c,
    GeometryShape shape,
    bool Function() canSelect,
  ) {
    if (!canSelect()) return;
    if (c.selected != shape) unawaited(GeoFeedback.selection(context));
    c.choose(shape);
  }

  Widget _reader(
    BuildContext context,
    SoloController c,
    SoloGame g,
    GeometryCardKind kind,
    Object scope,
    bool Function() canSelect,
  ) {
    final active = g.stage == kind;
    final reader = kind == GeometryCardKind.solid ? 'r1' : 'r2';
    final order = kind == GeometryCardKind.solid ? g.solidOrder : g.netOrder;
    final selectedIndex = c.selected == null ? -1 : order.indexOf(c.selected!);
    return GameReaderTarget(
      key: ValueKey('solo-reader-$reader'),
      scopeKey: scope,
      kind: kind,
      active: active,
      canSelect: canSelect,
      onSelected: (shape) => _choose(c, shape, canSelect),
      title: _text(context, active ? 'activeReader' : 'inactiveReader', {
        'reader': reader.toUpperCase(),
      }),
      message: _text(
        context,
        active
            ? 'dropHere'
            : kind == GeometryCardKind.solid
            ? 'readerComplete'
            : 'readerLocked',
      ),
      selection: !active || selectedIndex < 0
          ? null
          : _text(context, 'selection', {
              'card':
                  '${_text(context, kind.name)} ${String.fromCharCode(65 + selectedIndex)}',
            }),
      child: ActionButton(
        key: ValueKey('solo-$reader'),
        label: _text(context, reader),
        icon: kind == GeometryCardKind.solid
            ? Icons.filter_1_outlined
            : Icons.filter_2_outlined,
        onPressed: active && canSelect() && c.selected != null
            ? () {
                if (canSelect() && g.stage == kind && c.selected != null) {
                  c.scan(reader);
                }
              }
            : null,
      ),
    );
  }

  Widget _saveStatus(BuildContext context, SoloController c) =>
      c.failure != null
      ? _failure(context, c, () => unawaited(c.checkpoint()))
      : StatusNotice(
          key: const ValueKey('solo-save-status'),
          message: _text(context, c.saved ? 'saved' : 'saving'),
          tone: c.saved ? StatusTone.success : StatusTone.info,
        );
  Widget _result(BuildContext context, SoloController c, SoloGame g) {
    final analysis = analyseSolo(g.answers),
        english = AppStrings.of(context).locale.languageCode == 'en';
    return GeoMathScaffold(
      title: _text(context, 'result'),
      onBack: AppScope.of(context).router.back,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GeoMathCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _text(context, 'complete', {
                    'score': g.score,
                    'total': g.total,
                  }),
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                _gap(),
                Text('${_text(context, 'time')}: ${_time(g.time(c.now))}'),
                Text(
                  '${_text(context, 'mistakes')}: ${g.mistakes} · ${_text(context, 'skips')}: ${g.skipped}',
                ),
                Text('${_text(context, 'hints')}: ${g.hints}'),
              ],
            ),
          ),
          _gap(),
          StatusNotice(
            message: _text(
              context,
              c.receipt == null
                  ? 'unsavedResult'
                  : c.receipt!.state == FormativeSaveState.local
                  ? 'local'
                  : 'pending',
            ),
            tone: c.receipt == null ? StatusTone.warning : StatusTone.success,
          ),
          if (c.receipt == null) ...[
            _gap(),
            ActionButton(
              key: const ValueKey('solo-retry-save'),
              label: _text(context, 'retrySave'),
              onPressed: () => unawaited(c.finish()),
            ),
          ],
          if (g.mode != SoloMode.quiz) ...[
            _gap(),
            Text(_text(context, 'reviewScope')),
          ],
          _gap(),
          SectionHeader(
            title: _text(context, 'analysis'),
            subtitle: _text(context, 'reviewR2'),
          ),
          for (final row
              in analysis['byStage'] as List<Map<String, Object?>>) ...[
            _gap(),
            GeoMathCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _text(context, row['id'] as String),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    _text(context, 'stageSummary', {
                      'correct': row['correct']!,
                      'wrong': row['wrong']!,
                      'unattempted': row['notAttempted']!,
                    }),
                  ),
                ],
              ),
            ),
          ],
          for (final group in ['byShape', 'byTopic']) ...[
            _gap(),
            SectionHeader(title: _text(context, group)),
            for (final row in analysis[group] as List<Map<String, Object?>>)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  '${group == 'byShape' ? AppStrings.of(context).text('shape.${row['id']}') : _text(context, 'topic.${row['id']}')}: ${_text(context, 'groupSummary', {'correct': row['correct']!, 'total': row['total']!, 'wrong': row['wrong']!, 'skipped': row['skipped']!})}',
                ),
              ),
          ],
          _gap(),
          SectionHeader(title: _text(context, 'questionReview')),
          for (final a in g.answers)
            ExpansionTile(
              key: ValueKey('solo-analysis-item-${a.id}'),
              title: Text('${a.id} · ${_text(context, a.outcome)}'),
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      GameQuestionContent(
                        key: ValueKey('solo-analysis-question-${a.id}'),
                        text: prompt(g.bank.question(a.id), english),
                        languageCode: english ? 'en' : 'ms',
                      ),
                      _gap(),
                      Text(
                        _text(context, 'answer', {
                          'shape': AppStrings.of(context)
                              .text('shape.${a.shape.name}'),
                        }),
                      ),
                      Text(
                        'R1: ${a.solid == null ? _text(context, 'unattempted') : AppStrings.of(context).text('shape.${a.solid!.name}')}',
                      ),
                      Text(
                        'R2: ${a.net == null ? _text(context, 'unattempted') : AppStrings.of(context).text('shape.${a.net!.name}')}',
                      ),
                      if (a.hint) Text(_text(context, 'hintUsed')),
                    ],
                  ),
                ),
              ],
            ),
          if (g.missedIds.isNotEmpty && c.receipt != null) ...[
            _gap(),
            Text(_text(context, 'original')),
            _gap(),
            ActionButton(
              key: const ValueKey('solo-review-missed'),
              label: _text(context, 'missed'),
              onPressed: () async {
                final ids = g.missedIds;
                await c.start(
                  name: g.player['name']!,
                  mode: SoloMode.review,
                  questionIds: ids,
                  replaceConfirmed: true,
                );
              },
            ),
          ],
          _gap(),
          ActionButton(
            label: _text(context, 'scores'),
            kind: ActionButtonKind.secondary,
            onPressed: () => AppScope.of(context).router.open('solo-scores'),
          ),
          _gap(),
          ActionButton(
            key: const ValueKey('solo-new-round'),
            label: _text(context, 'newRound'),
            kind: ActionButtonKind.secondary,
            onPressed: c.receipt == null
                ? null
                : () => AppScope.of(context).router.open('cloud-game-play'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    timer?.cancel();
    widget.controller.game?.pause(widget.controller.now);
    super.dispose();
  }
}

final class SoloScoresPage extends StatefulWidget {
  const SoloScoresPage({required this.controller, super.key});
  final SoloController controller;
  @override
  State<SoloScoresPage> createState() => _SoloScoresPageState();
}

final class _SoloScoresPageState extends State<SoloScoresPage> {
  late Future<Result<List<SoloScore>>> scores;
  late ActorBinding owner;
  @override
  void initState() {
    super.initState();
    owner = widget.controller.actor;
    scores = _load();
    widget.controller.addListener(_changed);
  }

  void _changed() {
    if (owner == widget.controller.actor) return;
    setState(() {
      owner = widget.controller.actor;
      scores = _load();
    });
  }

  @override
  void dispose() {
    widget.controller.removeListener(_changed);
    super.dispose();
  }

  Future<Result<List<SoloScore>>> _load() async {
    final c = widget.controller;
    if (c.bank == null) await c.initialize();
    if (c.bank == null) {
      return const Failed(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'Solo content unavailable.',
        ),
      );
    }
    return c.repository.leaderboard(c.actor, c.bank!);
  }

  @override
  Widget build(BuildContext context) => GeoMathScaffold(
    title: _text(context, 'scores'),
    subtitle: _text(context, 'boardNote'),
    onBack: AppScope.of(context).router.back,
    body: FutureBuilder<Result<List<SoloScore>>>(
      key: ValueKey(owner),
      future: scores,
      builder: (context, snapshot) {
        final rows = snapshot.data?.valueOrNull;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (snapshot.connectionState != ConnectionState.done)
              const Center(child: CircularProgressIndicator())
            else if (rows == null)
              RetryPanel(
                title: _text(context, 'retry'),
                message: _text(
                  context,
                  snapshot.data?.failureOrNull?.code == FailureCode.stale
                      ? 'stale'
                      : 'storage',
                ),
                retryLabel: _text(context, 'retry'),
                onRetry: () => setState(() => scores = _load()),
              )
            else if (rows.isEmpty)
              EmptyState(
                title: _text(context, 'noScores'),
                message: _text(context, 'quizNote'),
                icon: Icons.emoji_events_outlined,
              )
            else
              for (var i = 0; i < rows.length; i++)
                GeoMathCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${i + 1}. ${rows[i].name}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        _text(context, 'boardRow', {
                          'score': rows[i].score,
                          'wrong': rows[i].mistakes,
                          'time': _time(rows[i].elapsed),
                        }),
                      ),
                    ],
                  ),
                ),
            _gap(),
            ActionButton(
              label: _text(context, 'refresh'),
              kind: ActionButtonKind.secondary,
              onPressed: () => setState(() => scores = _load()),
            ),
          ],
        );
      },
    ),
  );
}
