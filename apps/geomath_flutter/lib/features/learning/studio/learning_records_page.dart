import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/records/formative_record.dart';
import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/widgets/widgets.dart';
import '../persistence/learning_reflection_controller.dart';

/// Reads only the frozen shared DTOs. A reflection is never a live lab checkpoint.
class LearningRecordsPage extends StatefulWidget {
  const LearningRecordsPage({
    super.key,
    this.controller,
    this.onBack,
    this.onOpenActivity,
  });

  final LearningReflectionController? controller;
  final VoidCallback? onBack;
  final ValueChanged<ModuleActivity>? onOpenActivity;

  @override
  State<LearningRecordsPage> createState() => _LearningRecordsPageState();
}

class _LearningRecordsPageState extends State<LearningRecordsPage> {
  LearningReflectionController? _controller;
  bool _ownsController = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_controller != null) {
      return;
    }
    _attach();
  }

  void _attach() {
    if (widget.controller != null) {
      _controller = widget.controller;
      return;
    }
    final app = AppScope.of(context).dependencies;
    final services = app.composition.services;
    if (services.contains(learningReflectionControllerKey)) {
      _controller = services.get(learningReflectionControllerKey);
    } else {
      _ownsController = true;
      _controller = LearningReflectionController(
        reader: services.get(FoundationServices.recordsReader),
        writer: services.get(FoundationServices.recordsWriter),
        sessions: services.get(FoundationServices.sessions),
      );
    }
  }

  @override
  void didUpdateWidget(LearningRecordsPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller == widget.controller) {
      return;
    }
    if (_ownsController) _controller?.dispose();
    _ownsController = false;
    _controller = null;
    _attach();
  }

  @override
  void dispose() {
    if (_ownsController) _controller?.dispose();
    super.dispose();
  }

  void _openActivity(ModuleActivity activity) {
    if (widget.onOpenActivity != null) {
      widget.onOpenActivity!(activity);
    } else {
      AppScope.of(context).router.open('learning-${activity.name}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final scope = context.getInheritedWidgetOfExactType<AppScope>();
    return GeoMathScaffold(
      title: strings.text('learning_studio.recordsTitle'),
      onBack: widget.onBack ?? scope?.router.back,
      body: AnimatedBuilder(
        animation: _controller!,
        builder: (context, _) {
          final controller = _controller!;
          final completed = controller.records.where((r) => r.completed).length;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SectionHeader(
                key: const ValueKey('learning-records-count'),
                title: strings.text(
                  'learning_studio.recordsCount',
                  parameters: {'count': completed},
                ),
              ),
              const SizedBox(height: 12),
              StatusNotice(
                key: const ValueKey('learning-records-scope'),
                message: strings.text('learning_studio.recordsScope'),
              ),
              const SizedBox(height: 16),
              if (controller.loading)
                Semantics(
                  liveRegion: true,
                  child: Text(strings.text('learning_studio.loading')),
                ),
              if (controller.readFailure != null) ...[
                RetryPanel(
                  key: const ValueKey('learning-records-read-failure'),
                  title: strings.text('learning_studio.readFailedTitle'),
                  message: strings.text('learning_studio.readFailed'),
                  retryLabel: strings.text('learning_studio.retry'),
                  onRetry: controller.retryRead,
                ),
                const SizedBox(height: 16),
              ],
              if (controller.saveFailure != null) ...[
                RetryPanel(
                  key: const ValueKey('learning-records-save-failure'),
                  title: strings.text('learning_studio.saveFailedTitle'),
                  message: strings.text(
                    controller.saveFailure!.code == FailureCode.unavailable
                        ? 'learning_studio.queueUnavailable'
                        : 'learning_studio.saveFailed',
                  ),
                  retryLabel: strings.text('learning_studio.retry'),
                  onRetry: controller.retryFailed,
                  busy: controller.saving,
                ),
                const SizedBox(height: 16),
              ] else if (controller.saving) ...[
                StatusNotice(
                  message: strings.text('learning_studio.saving'),
                  liveRegion: true,
                ),
                const SizedBox(height: 16),
              ] else if (controller.lastReceipt != null) ...[
                StatusNotice(
                  key: const ValueKey('learning-records-receipt'),
                  message: strings.text(
                    controller.lastReceipt!.state == FormativeSaveState.local
                        ? 'learning_studio.savedLocal'
                        : 'learning_studio.savedPending',
                  ),
                  tone: StatusTone.success,
                  liveRegion: true,
                ),
                const SizedBox(height: 16),
              ],
              if (!controller.loading &&
                  controller.readFailure == null &&
                  controller.records.isEmpty) ...[
                EmptyState(
                  title: strings.text('learning_studio.emptyTitle'),
                  message: strings.text('learning_studio.emptyMessage'),
                  icon: Icons.auto_stories_rounded,
                ),
                const SizedBox(height: 16),
              ],
              for (final activity in ModuleActivity.values) ...[
                _ReflectionCard(
                  activity: activity,
                  reflection: controller.records
                      .where((r) => r.activity == activity)
                      .firstOrNull,
                  onOpen: () => _openActivity(activity),
                ),
                const SizedBox(height: 12),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _ReflectionCard extends StatelessWidget {
  const _ReflectionCard({
    required this.activity,
    required this.reflection,
    required this.onOpen,
  });

  final ModuleActivity activity;
  final ModuleReflection? reflection;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final record = reflection;
    final stageKey = switch (record?.stage) {
      ReflectionStage.prediction => 'stagePrediction',
      ReflectionStage.experiment => 'stageExperiment',
      ReflectionStage.check => 'stageCheck',
      ReflectionStage.explanation => 'stageExplanation',
      null => 'notStarted',
    };
    return GeoMathCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ExpansionTile(
            key: ValueKey('learning-record-${activity.name}'),
            title: Text(strings.text('learning_studio.${activity.name}')),
            subtitle: Text(
              strings.text(
                'learning_studio.${record?.completed == true ? 'complete' : stageKey}',
              ),
            ),
            childrenPadding: const EdgeInsets.all(12),
            children: [
              for (final (label, text) in [
                ('prediction', record?.prediction),
                ('result', record?.result),
                ('explanation', record?.explanation),
              ])
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        strings.text('learning_studio.$label'),
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        text == null || text.isEmpty
                            ? strings.text('learning_studio.notRecorded')
                            : text,
                      ),
                    ],
                  ),
                ),
            ],
          ),
          ActionButton(
            label: strings.text(
              record?.completed == true
                  ? 'learning_studio.revisit'
                  : 'learning_studio.continue',
            ),
            kind: ActionButtonKind.secondary,
            onPressed: onOpen,
          ),
        ],
      ),
    );
  }
}
