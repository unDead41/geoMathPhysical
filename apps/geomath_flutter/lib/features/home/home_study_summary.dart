import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_dependencies.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/navigation/app_navigation.dart';
import '../../core/records/formative_record.dart';
import '../../core/result.dart';
import '../../core/session/actor_binding.dart';
import '../../core/widgets/widgets.dart';
import '../learning/application/learning_services.dart';
import '../learning/persistence/learning_checkpoint_repository.dart';
import '../solo/solo_feature.dart';
import '../sync/sync_feature.dart';

/// Home reads the existing local owners. It never creates a second progress
/// store, promotes a draft to a completed reflection, or uploads guest data.
final class HomeStudySummary extends StatelessWidget {
  const HomeStudySummary({super.key});

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    final dependencies = scope.dependencies;
    if (!dependencies.composition.services.contains(
      learningCheckpointRepositoryKey,
    )) {
      return const SizedBox.shrink();
    }
    return StreamBuilder<ActorBinding>(
      stream: dependencies.sessions.bindings,
      builder: (context, _) {
        final actor = dependencies.sessions.current;
        return _ActorStudySummary(
          key: ValueKey(actor),
          dependencies: dependencies,
          actor: actor,
          visible: AppRouteScope.maybeOf(context)?.isCurrent ?? true,
        );
      },
    );
  }
}

final class _ActorStudySummary extends StatefulWidget {
  const _ActorStudySummary({
    required this.dependencies,
    required this.actor,
    required this.visible,
    super.key,
  });

  final AppDependencies dependencies;
  final ActorBinding actor;
  final bool visible;

  @override
  State<_ActorStudySummary> createState() => _ActorStudySummaryState();
}

final class _ActorStudySummaryState extends State<_ActorStudySummary> {
  late Future<Result<LearningResumeCheckpoint?>> _latest;
  late Future<Result<List<CompletedSoloRecord>>> _soloRecords;
  Future<Result<bool>>? _soloSlot;
  late Stream<Result<List<ModuleReflection>>> _reflections;
  SoloController? _solo;

  @override
  void initState() {
    super.initState();
    final services = widget.dependencies.composition.services;
    if (services.contains(SoloServices.controller)) {
      _solo = services.get(SoloServices.controller);
    }
    _reload();
  }

  void _reload() {
    final dependencies = widget.dependencies;
    _latest = dependencies.composition.services
        .get(learningCheckpointRepositoryKey)
        .readLatest(widget.actor);
    _soloRecords = dependencies.records.readCompletedSolo(widget.actor);
    _reflections = dependencies.records.watchReflections(widget.actor);
    if (_solo != null) {
      _soloSlot = dependencies.composition.services
          .get(SoloServices.repository)
          .hasLocalSlot(widget.actor);
    }
  }

  @override
  void didUpdateWidget(_ActorStudySummary oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible && !oldWidget.visible) {
      _reload();
    }
  }

  String text(String ms, String en) =>
      AppStrings.of(context).locale.languageCode == 'en' ? en : ms;

  void _resume(LearningResumeCheckpoint checkpoint) {
    if (!widget.dependencies.sessions.isCurrent(widget.actor)) return;
    final route = 'learning-${checkpoint.section}';
    final scope = AppScope.of(context);
    if (!widget.dependencies.composition.routes.contains(route)) return;
    scope.router.open(
      route,
      arguments: {
        'shapeId': checkpoint.shapeId,
        if (checkpoint.mode != null) 'mode': checkpoint.mode,
        'checkpoint': checkpoint.payload,
        'checkpointActor': widget.actor,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.dependencies.sessions.isCurrent(widget.actor)) {
      return const SizedBox.shrink();
    }
    final strings = AppStrings.of(context);
    final scope = AppScope.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 24),
        SectionHeader(title: text('Sambung & kemajuan', 'Continue & progress')),
        const SizedBox(height: 12),
        GeoMathCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FutureBuilder<Result<LearningResumeCheckpoint?>>(
                future: _latest,
                builder: (context, snapshot) {
                  final checkpoint = snapshot.data?.valueOrNull;
                  if (snapshot.hasError ||
                      snapshot.data?.failureOrNull != null) {
                    return StatusNotice(
                      key: const ValueKey('home-checkpoint-error'),
                      message: text(
                        'Draf belum dapat dibaca. Draf asal dikekalkan.',
                        'The draft could not be read. The original was kept.',
                      ),
                      tone: StatusTone.warning,
                      action: TextButton(
                        onPressed: () => setState(_reload),
                        child: Text(text('Cuba semula', 'Retry')),
                      ),
                    );
                  }
                  if (snapshot.connectionState != ConnectionState.done) {
                    return Text(
                      text(
                        'Membaca aktiviti setempat…',
                        'Reading local activity…',
                      ),
                    );
                  }
                  if (checkpoint == null) {
                    return Text(
                      text(
                        'Pilih bongkah untuk memulakan penerokaan. Draf akan tersedia di sini.',
                        'Choose a solid to start exploring. Your draft will appear here.',
                      ),
                    );
                  }
                  final label = strings.text(
                    'learning.${checkpoint.section}Title',
                  );
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        strings.text(
                          'learning.shape.${checkpoint.shapeId.replaceAll('-', '_')}',
                        ),
                      ),
                      const SizedBox(height: 12),
                      ActionButton(
                        key: const ValueKey('home-resume-learning'),
                        label: text('Sambung aktiviti', 'Continue activity'),
                        icon: Icons.play_arrow_rounded,
                        onPressed: () => _resume(checkpoint),
                      ),
                    ],
                  );
                },
              ),
              if (_solo != null)
                FutureBuilder<Result<bool>>(
                  future: _soloSlot,
                  builder: (context, snapshot) => AnimatedBuilder(
                    animation: _solo!,
                    builder: (context, _) {
                      final solo = _solo!;
                      if (solo.actor != widget.actor ||
                          (snapshot.data?.valueOrNull != true &&
                              solo.savedSlot == null &&
                              solo.game == null)) {
                        return const SizedBox.shrink();
                      }
                      return Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: ActionButton(
                          key: const ValueKey('home-resume-solo'),
                          label: text(
                            'Sambung / semak solo',
                            'Resume / review solo',
                          ),
                          kind: ActionButtonKind.secondary,
                          icon: Icons.sports_esports_outlined,
                          onPressed: () => scope.router.open('solo-resume'),
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 20),
              StreamBuilder<Result<List<ModuleReflection>>>(
                stream: _reflections,
                builder: (context, snapshot) {
                  final records = snapshot.data?.valueOrNull;
                  if (snapshot.hasError ||
                      snapshot.data?.failureOrNull != null) {
                    return Text(
                      text(
                        'Kemajuan belum dapat dibaca.',
                        'Progress could not be read.',
                      ),
                    );
                  }
                  if (records == null) {
                    return Text(
                      text('Membaca refleksi…', 'Reading reflections…'),
                    );
                  }
                  final complete = records
                      .where((record) => record.completed)
                      .map((record) => record.activity)
                      .toSet()
                      .length;
                  final label = text(
                    '$complete daripada 4 refleksi lengkap',
                    '$complete of 4 reflections complete',
                  );
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        label,
                        key: const ValueKey('home-reflection-progress'),
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: complete / 4,
                        semanticsLabel: label,
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 12),
              FutureBuilder<Result<List<CompletedSoloRecord>>>(
                future: _soloRecords,
                builder: (context, snapshot) {
                  final records = snapshot.data?.valueOrNull;
                  if (records == null) return const SizedBox.shrink();
                  return Text(
                    text(
                      'Keputusan solo tersimpan: ${records.length}',
                      'Saved solo results: ${records.length}',
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              Text(
                text(
                  'Rekod latihan kendiri pada peranti ini.',
                  'Self-study records on this device.',
                ),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              TextButton.icon(
                key: const ValueKey('home-study-records'),
                onPressed: () => scope.router.open('learning-records'),
                icon: const Icon(Icons.history_rounded),
                label: Text(text('Lihat rekod latihan', 'View study records')),
              ),
            ],
          ),
        ),
        if (widget.dependencies.composition.services.contains(
          SyncServices.controller,
        )) ...[
          const SizedBox(height: 12),
          AnimatedBuilder(
            animation: widget.dependencies.composition.services.get(
              SyncServices.controller,
            ),
            builder: (context, _) {
              final state = widget.dependencies.composition.services
                  .get(SyncServices.controller)
                  .state;
              if (state.actor != widget.actor) return const SizedBox.shrink();
              return GeoMathCard(
                key: const ValueKey('home-sync-status'),
                padding: const EdgeInsets.all(4),
                child: ListTile(
                  minVerticalPadding: 12,
                  leading: Icon(switch (state.status) {
                    FormativeSyncStatus.local => Icons.save_outlined,
                    FormativeSyncStatus.synced => Icons.cloud_done_outlined,
                    FormativeSyncStatus.syncing => Icons.sync_rounded,
                    _ => Icons.cloud_upload_outlined,
                  }),
                  title: Text(strings.text('sync.status.${state.status.name}')),
                  subtitle: state.actor.isGuest
                      ? null
                      : Text(
                          strings.text(
                            'sync.pending',
                            parameters: {'count': state.pending},
                          ),
                        ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => scope.router.open('sync.pending'),
                ),
              );
            },
          ),
        ],
      ],
    );
  }
}
