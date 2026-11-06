import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/geometry/geometry_card_provider.dart';
import '../../../core/geometry/geometry_card_view.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/navigation/app_navigation.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/widgets/widgets.dart';
import '../../duel/presentation/game_card_carousel.dart';
import '../../duel/presentation/game_question_content.dart';
import '../../solo/domain/solo_bank.dart';
import '../../solo/presentation/solo_strings.dart' show englishQuestions;
import '../application/ai_battle_controller.dart';
import '../domain/ai_battle_game.dart';

/// Real local match presentation; all choices, clocks and saves use the owner.
final class AiBattleScreen extends StatefulWidget {
  const AiBattleScreen({
    super.key,
    required this.controller,
    required this.geometry,
  });
  final AiBattleController controller;
  final GeometryCardProvider geometry;

  @override
  State<AiBattleScreen> createState() => _AiBattleScreenState();
}

final class _AiBattleScreenState extends State<AiBattleScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  AiDifficulty _difficulty = AiDifficulty.medium;
  Timer? _timer;
  late ActorBinding _actor;
  bool _visible = true;
  bool _confirming = false;
  int _lastCheckpoint = 0;
  int _actionGeneration = 0;
  AiBattleController get c => widget.controller;

  String t(String key, [Map<String, Object> args = const {}]) =>
      AppStrings.of(context).text('ai_battle.$key', parameters: args);
  String _shape(GeometryShape? shape) => shape == null
      ? t('notAttempted')
      : AppStrings.of(context).text('shape.${shape.name}');
  String _seconds(int milliseconds) {
    final seconds = milliseconds / 1000;
    return seconds == seconds.roundToDouble()
        ? seconds.toInt().toString()
        : seconds.toStringAsFixed(1);
  }

  String _time(num milliseconds) {
    final seconds = (milliseconds / 1000).floor().clamp(0, 999999);
    return '${(seconds ~/ 60).toString().padLeft(2, '0')}:${(seconds % 60).toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    _actor = c.actor;
    c.addListener(_ownerChanged);
    _lastCheckpoint = c.now;
    _timer = Timer.periodic(const Duration(milliseconds: 200), (_) {
      final game = c.game;
      if (!_visible || game == null || game.paused) return;
      c.tick();
      if (game.status != AiBattleStatus.finished &&
          c.now - _lastCheckpoint >= 5000) {
        _lastCheckpoint = c.now;
        unawaited(c.checkpoint());
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(c.initialize());
    });
  }

  void _ownerChanged() {
    if (_actor == c.actor) return;
    _actor = c.actor;
    _actionGeneration++;
    _name.clear();
    _difficulty = AiDifficulty.medium;
    _lastCheckpoint = c.now;
  }

  @override
  void didUpdateWidget(AiBattleScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller == c) return;
    oldWidget.controller.removeListener(_ownerChanged);
    _actor = c.actor;
    _actionGeneration++;
    _name.clear();
    _difficulty = AiDifficulty.medium;
    _lastCheckpoint = c.now;
    c.addListener(_ownerChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(c.initialize());
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final visible = AppRouteScope.maybeOf(context)?.isCurrent ?? true;
    if (_visible && !visible) {
      final owner = c;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && identical(owner, c) && !_visible) owner.pause();
      });
    }
    _visible = visible;
  }

  Future<void> _start() async {
    if (_confirming || c.busy || !_form.currentState!.validate()) return;
    final owner = c, actor = c.actor, generation = _actionGeneration;
    final name = _name.text, difficulty = _difficulty;
    var replace = false;
    if (c.savedSlot != null || c.failure?.code == FailureCode.invalid) {
      setState(() => _confirming = true);
      try {
        replace = await showGeoMathConfirmation(
          context,
          title: t('replaceTitle'),
          message: t('replaceBody'),
          confirmLabel: t('replace'),
          cancelLabel: t('cancel'),
          danger: true,
        );
      } finally {
        if (mounted) setState(() => _confirming = false);
      }
      if (!replace) return;
    }
    if (!mounted ||
        !_visible ||
        !identical(owner, c) ||
        actor != c.actor ||
        generation != _actionGeneration) {
      return;
    }
    FocusManager.instance.primaryFocus?.unfocus();
    await c.start(
      name: name,
      difficulty: difficulty,
      replaceConfirmed: replace,
    );
  }

  String _question(SoloQuestion question) =>
      AppStrings.of(context).locale.languageCode == 'en'
      ? englishQuestions[question.id]?.$1 ?? question.prompt
      : question.prompt;
  String _hint(SoloQuestion question) =>
      AppStrings.of(context).locale.languageCode == 'en'
      ? englishQuestions[question.id]?.$2 ?? question.hint
      : question.hint;

  bool _current(
    AiBattleGame game,
    ActorBinding actor,
    String? attempt,
    String question,
    GeometryCardKind stage,
  ) =>
      mounted &&
      _visible &&
      identical(c.game, game) &&
      c.actor == actor &&
      c.attemptId == attempt &&
      game.player.question.id == question &&
      game.player.stage == stage &&
      game.canChoose &&
      !c.busy;

  Widget _gap() => const SizedBox(height: 16);

  Widget _failure(VoidCallback retry) {
    final failure = c.failure!;
    final key = failure.message.startsWith('ai_battle.')
        ? failure.message.substring('ai_battle.'.length)
        : switch (failure.code) {
            FailureCode.invalid => 'invalidSave',
            FailureCode.conflict => 'replaceRequired',
            FailureCode.stale => 'stale',
            _ => c.game == null ? 'loadFailed' : 'saveFailed',
          };
    return RetryPanel(
      key: const ValueKey('ai-error'),
      title: t('retry'),
      message: t(key),
      retryLabel: t('retry'),
      onRetry: retry,
    );
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: c,
    builder: (context, _) {
      final game = c.game;
      if (game == null) return _setup();
      if (game.status == AiBattleStatus.finished) return _result(game);
      return _match(game);
    },
  );

  Widget _setup() {
    final profile = AiDifficultyProfile.of(_difficulty);
    return GeoMathScaffold(
      key: const ValueKey('ai-setup-shell'),
      title: t('title'),
      subtitle: t('intro'),
      onBack: AppScope.of(context).router.back,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Form(
            key: _form,
            child: GeoMathCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  LabeledField(
                    key: const ValueKey('ai-name'),
                    label: t('name'),
                    controller: _name,
                    maxLength: 60,
                    enabled: !c.busy && !_confirming,
                    textInputAction: TextInputAction.done,
                    validator: (value) {
                      final clean = (value ?? '').trim().replaceAll(
                        RegExp(r'\s+'),
                        ' ',
                      );
                      return clean.length >= 2 && clean.length <= 60
                          ? null
                          : t('nameInvalid');
                    },
                  ),
                  _gap(),
                  Text(
                    t('difficulty'),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  ChoiceChips<AiDifficulty>(
                    key: const ValueKey('ai-difficulty'),
                    options: [
                      for (final level in AiDifficulty.values)
                        ChoiceChipOption(value: level, label: t(level.name)),
                    ],
                    selected: _difficulty,
                    enabled: !c.busy && !_confirming,
                    onSelected: (level) => setState(() => _difficulty = level),
                  ),
                  _gap(),
                  Text(t('${_difficulty.name}Description')),
                  const SizedBox(height: 8),
                  Text(
                    t('accuracyLimits', {
                      'minimum': (profile.accuracyMin * 100).round(),
                      'maximum': (profile.accuracyMax * 100).round(),
                    }),
                  ),
                  Text(
                    t('timeLimits', {
                      'minimum': _seconds(profile.endMinAnswerMs),
                      'maximum': _seconds(profile.startMaxAnswerMs),
                    }),
                  ),
                  _gap(),
                  ActionButton(
                    key: const ValueKey('ai-start'),
                    label: t('start'),
                    icon: Icons.smart_toy_outlined,
                    onPressed: c.loading || c.bank == null || _confirming
                        ? null
                        : _start,
                    busy: c.busy,
                  ),
                ],
              ),
            ),
          ),
          _gap(),
          StatusNotice(message: t('adaptation')),
          _gap(),
          Text(t('probabilityNote')),
          _gap(),
          Text(t('rules')),
          if (c.loading) ...[
            _gap(),
            const Center(child: CircularProgressIndicator()),
          ],
          if (c.failure != null) ...[
            _gap(),
            _failure(() => unawaited(c.initialize())),
          ],
          if (c.savedSlot != null) ...[
            _gap(),
            GeoMathCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    t('savedMatch'),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(t('savedMatchNote')),
                  _gap(),
                  ActionButton(
                    key: const ValueKey('ai-resume-saved'),
                    label: t('resumeSaved'),
                    icon: Icons.history_rounded,
                    kind: ActionButtonKind.secondary,
                    onPressed: c.busy || c.loading
                        ? null
                        : () => unawaited(c.resumeSaved()),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _scores(AiBattleGame game) => LayoutBuilder(
    builder: (context, constraints) => Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final row in [
          (t('you'), game.player.score, game.player.time(c.now)),
          (
            '${t('ai')} · ${t(game.difficulty.name)}',
            game.aiScore,
            game.aiElapsed,
          ),
        ])
          SizedBox(
            width: constraints.maxWidth < 420
                ? constraints.maxWidth
                : (constraints.maxWidth - 12) / 2,
            child: GeoMathCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(row.$1, style: Theme.of(context).textTheme.titleMedium),
                  Text(t('score', {'score': row.$2, 'total': game.total})),
                  Text(t('answerTime', {'time': _time(row.$3)})),
                ],
              ),
            ),
          ),
      ],
    ),
  );

  Widget _match(AiBattleGame game) {
    final player = game.player,
        profile = AiDifficultyProfile.of(game.difficulty);
    // The active plan was committed at question start. Current-question success
    // must not change the displayed plan or reveal its sampled outcome/timing.
    final correctBefore = player.answers
        .take(game.index)
        .where((answer) => answer.outcome == 'correct')
        .length;
    final limits = profile.boundsForCorrect(correctBefore);
    final actor = c.actor, attempt = c.attemptId;
    final question = player.question.id, stage = player.stage;
    final playerDone = player.answers.length > game.index;
    bool current() => _current(game, actor, attempt, question, stage);
    return GeoMathScaffold(
      key: ValueKey(('ai-match-shell', attempt, game.index)),
      title: t('title'),
      onBack: AppScope.of(context).router.back,
      actions: [
        IconButton(
          key: const ValueKey('ai-pause'),
          tooltip: t('pause'),
          onPressed: game.paused || c.busy
              ? null
              : () {
                  if (identical(c.game, game) && c.actor == actor) c.pause();
                },
          icon: const Icon(Icons.pause_rounded),
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
        ),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            t('question', {'number': game.index + 1, 'total': game.total}),
            key: const ValueKey('ai-question-number'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: game.index / game.total),
          _gap(),
          _scores(game),
          _gap(),
          GeoMathCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  t('topic.${player.question.topic}'),
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                GameQuestionContent(
                  key: const ValueKey('ai-question-content'),
                  text: _question(player.question),
                  languageCode: AppStrings.of(context).locale.languageCode,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
          ),
          _gap(),
          GeoMathCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  t('aiTarget'),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  t('accuracyTarget', {
                    'percent': (game.currentPlan.accuracy * 100).round(),
                  }),
                  key: const ValueKey('ai-target-accuracy'),
                ),
                Text(
                  t('timeTarget', {
                    'minimum': _seconds(limits.minimum),
                    'maximum': _seconds(limits.maximum),
                  }),
                  key: const ValueKey('ai-target-time'),
                ),
                Text(t('correctCount', {'count': player.score})),
                const SizedBox(height: 8),
                Text(
                  t(
                    game.paused
                        ? 'aiPaused'
                        : switch (game.aiStage) {
                            AiOpponentStage.solid => 'aiSolid',
                            AiOpponentStage.net => 'aiNet',
                            AiOpponentStage.done => 'aiDone',
                          },
                  ),
                  key: const ValueKey('ai-opponent-state'),
                ),
                if (!game.questionSettled) ...[
                  const SizedBox(height: 8),
                  Text(t('answerHidden')),
                ],
              ],
            ),
          ),
          if (game.paused) ...[
            _gap(),
            StatusNotice(
              key: const ValueKey('ai-paused'),
              message: t('paused'),
              action: ActionButton(
                key: const ValueKey('ai-resume'),
                label: t('resume'),
                onPressed: c.busy ? null : c.resume,
              ),
            ),
          ],
          Visibility(
            visible: game.canChoose,
            maintainState: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _gap(),
                SectionHeader(
                  title: t(
                    stage == GeometryCardKind.solid ? 'stepSolid' : 'stepNet',
                  ),
                  subtitle: t('choose'),
                ),
                _gap(),
                _choices(game),
                _gap(),
                ActionButton(
                  key: const ValueKey('ai-r1'),
                  label: t('r1'),
                  icon: Icons.filter_1_outlined,
                  onPressed:
                      !c.busy &&
                          stage == GeometryCardKind.solid &&
                          game.selected != null
                      ? () {
                          if (current()) c.scan('r1');
                        }
                      : null,
                ),
                _gap(),
                ActionButton(
                  key: const ValueKey('ai-r2'),
                  label: t('r2'),
                  icon: Icons.filter_2_outlined,
                  onPressed:
                      !c.busy &&
                          stage == GeometryCardKind.net &&
                          game.selected != null
                      ? () {
                          if (current()) c.scan('r2');
                        }
                      : null,
                ),
                _gap(),
                ActionButton(
                  key: const ValueKey('ai-hint'),
                  label: t(player.hintOpen ? 'hideHint' : 'hint'),
                  kind: ActionButtonKind.tonal,
                  onPressed: c.busy
                      ? null
                      : () {
                          if (current()) c.hint();
                        },
                ),
                if (player.hintOpen) ...[
                  _gap(),
                  StatusNotice(message: _hint(player.question)),
                ],
                _gap(),
                ActionButton(
                  key: const ValueKey('ai-skip'),
                  label: t('skip'),
                  kind: ActionButtonKind.secondary,
                  onPressed: c.busy
                      ? null
                      : () {
                          if (current()) c.skip();
                        },
                ),
              ],
            ),
          ),
          if (playerDone && !game.questionSettled) ...[
            _gap(),
            StatusNotice(
              key: const ValueKey('ai-waiting'),
              message: t('waitingAi'),
              liveRegion: true,
            ),
          ],
          if (game.questionSettled) ...[
            _gap(),
            _review(game),
            _gap(),
            ActionButton(
              key: const ValueKey('ai-continue'),
              label: t(game.index == game.total - 1 ? 'finish' : 'continue'),
              onPressed: c.busy || !game.canContinue(c.now)
                  ? null
                  : () {
                      if (identical(c.game, game) &&
                          c.actor == actor &&
                          game.player.question.id == question) {
                        c.continueQuestion();
                      }
                    },
            ),
            if (!game.canContinue(c.now)) ...[
              const SizedBox(height: 8),
              Text(t('reviewWait')),
            ],
          ],
          _gap(),
          _saveState(),
        ],
      ),
    );
  }

  Widget _choices(AiBattleGame game) {
    final stage = game.player.stage;
    final order = stage == GeometryCardKind.solid
        ? game.player.solidOrder
        : game.player.netOrder;
    final actor = c.actor,
        attempt = c.attemptId,
        question = game.player.question.id;
    return GameCardCarousel(
      scopeKey: (attempt, question, stage),
      keyPrefix: 'ai-cards',
      itemCount: order.length,
      previousLabel: t('previousCard'),
      nextLabel: t('nextCard'),
      positionLabel: (number, total) =>
          t('cardPosition', {'number': number, 'total': total}),
      reducedMotion: MediaQuery.disableAnimationsOf(context),
      cardBuilder: (context, index, width) {
        final shape = order[index];
        final label = '${t(stage.name)} ${String.fromCharCode(65 + index)}';
        return Semantics(
          button: true,
          selected: game.selected == shape,
          label: label,
          child: GeoMathCard(
            key: ValueKey('ai-choice-${stage.name}-${shape.name}'),
            color: game.selected == shape
                ? Theme.of(context).colorScheme.primaryContainer
                : null,
            padding: const EdgeInsets.all(10),
            onTap: () {
              if (_current(game, actor, attempt, question, stage)) {
                c.choose(shape);
              }
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ExcludeSemantics(
                  child: GeometryCardView(
                    shape: shape,
                    kind: stage,
                    provider: widget.geometry,
                    semanticLabel: '',
                    size: (width - 32).clamp(88.0, 128.0).toDouble(),
                  ),
                ),
                const SizedBox(height: 8),
                Text(label, textAlign: TextAlign.center),
                SizedBox(
                  height: 24,
                  child: game.selected == shape
                      ? const Icon(Icons.check_circle_outline_rounded)
                      : null,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _review(AiBattleGame game) {
    final human = game.player.answers[game.index];
    final ai = game.aiAnswers[game.index];
    return GeoMathCard(
      key: const ValueKey('ai-question-review'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(t('review'), style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            t('answer', {'shape': _shape(game.player.question.shape)}),
            key: const ValueKey('ai-correct-answer'),
          ),
          _gap(),
          Text(
            t('outcome', {'name': t('you'), 'outcome': t(human.outcome)}),
            key: const ValueKey('ai-player-feedback'),
          ),
          Text(
            t('choices', {
              'solid': _shape(human.solid),
              'net': _shape(human.net),
            }),
          ),
          _gap(),
          Text(t('outcome', {'name': t('ai'), 'outcome': t(ai.outcome)})),
          Text(
            t('choices', {'solid': _shape(ai.solid), 'net': _shape(ai.net)}),
          ),
        ],
      ),
    );
  }

  Widget _saveState() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (c.failure != null)
        _failure(() => unawaited(c.checkpoint()))
      else
        StatusNotice(
          key: const ValueKey('ai-save-state'),
          message: t(c.saved ? 'saved' : 'saving'),
          tone: c.saved ? StatusTone.success : StatusTone.info,
        ),
      _gap(),
      ActionButton(
        key: const ValueKey('ai-save'),
        label: t('save'),
        kind: ActionButtonKind.secondary,
        onPressed: c.busy ? null : () => unawaited(c.checkpoint()),
      ),
    ],
  );

  Widget _result(AiBattleGame game) => GeoMathScaffold(
    key: ValueKey(('ai-result-shell', c.attemptId)),
    title: t('result'),
    onBack: AppScope.of(context).router.back,
    body: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          t(switch (game.winner) {
            AiBattleWinner.player => 'playerWins',
            AiBattleWinner.ai => 'aiWins',
            _ => 'draw',
          }),
          key: const ValueKey('ai-winner'),
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        _gap(),
        _scores(game),
        _gap(),
        Text(t('winnerRule')),
        _gap(),
        StatusNotice(message: t('resultScope')),
        _gap(),
        _saveState(),
        _gap(),
        ActionButton(
          key: const ValueKey('ai-new-match'),
          label: t('newMatch'),
          icon: Icons.replay_rounded,
          onPressed: c.busy || !c.saved ? null : c.newMatch,
        ),
        _gap(),
        SectionHeader(title: t('answerReview')),
        for (var index = 0; index < game.player.answers.length; index++)
          _resultAnswer(game, index),
      ],
    ),
  );

  Widget _resultAnswer(AiBattleGame game, int index) {
    final human = game.player.answers[index], ai = game.aiAnswers[index];
    final question = game.player.bank.question(human.id);
    return ExpansionTile(
      key: ValueKey('ai-analysis-${human.id}'),
      title: Text('${index + 1} · ${t(human.outcome)}'),
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GameQuestionContent(
                text: _question(question),
                languageCode: AppStrings.of(context).locale.languageCode,
              ),
              _gap(),
              Text(t('answer', {'shape': _shape(question.shape)})),
              Text(
                t('outcome', {'name': t('you'), 'outcome': t(human.outcome)}),
              ),
              Text(
                t('choices', {
                  'solid': _shape(human.solid),
                  'net': _shape(human.net),
                }),
              ),
              Text(t('outcome', {'name': t('ai'), 'outcome': t(ai.outcome)})),
              Text(
                t('choices', {
                  'solid': _shape(ai.solid),
                  'net': _shape(ai.net),
                }),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    c.removeListener(_ownerChanged);
    c.game?.pause(c.now);
    _name.dispose();
    super.dispose();
  }
}
