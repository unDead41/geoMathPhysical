import 'package:flutter/material.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/records/formative_records.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/widgets/widgets.dart';
import '../application/formative_sync_controller.dart';

final class SyncScreen extends StatefulWidget {
  const SyncScreen({
    required this.controller,
    this.onBack,
    this.onSignIn,
    super.key,
  });
  final FormativeSyncController controller;
  final VoidCallback? onBack;
  final VoidCallback? onSignIn;
  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

final class _SyncScreenState extends State<SyncScreen> {
  Result<SelfStudyHistory>? _history;
  ActorBinding? _historyActor;
  bool _loading = false;

  Future<void> _loadHistory() async {
    final actor = widget.controller.state.actor;
    setState(() {
      _loading = true;
      _history = null;
      _historyActor = actor;
    });
    final result = await widget.controller.readHistory(refresh: true);
    if (!mounted || widget.controller.state.actor != actor) return;
    setState(() {
      _loading = false;
      _history = result;
    });
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final state = widget.controller.state;
      final strings = AppStrings.of(context);
      final busy = state.status == FormativeSyncStatus.syncing;
      final tone = switch (state.status) {
        FormativeSyncStatus.synced => StatusTone.success,
        FormativeSyncStatus.blocked ||
        FormativeSyncStatus.storageFailed => StatusTone.error,
        FormativeSyncStatus.needsAuth ||
        FormativeSyncStatus.unavailable ||
        FormativeSyncStatus.stopped => StatusTone.warning,
        _ => StatusTone.info,
      };
      final history =
          _historyActor == state.actor &&
              !const {
                FormativeSyncStatus.needsAuth,
                FormativeSyncStatus.blocked,
              }.contains(state.status)
          ? _history
          : null;
      return GeoMathScaffold(
        title: strings.text('sync.title'),
        onBack: widget.onBack,
        subtitle: strings.text('sync.intro'),
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            StatusNotice(
              key: ValueKey('sync.status.${state.status.name}'),
              message: strings.text('sync.status.${state.status.name}'),
              tone: tone,
              liveRegion: true,
            ),
            const SizedBox(height: 16),
            Text(
              strings.text(
                'sync.pending',
                parameters: {'count': state.pending},
              ),
            ),
            if (state.unsaved > 0) ...[
              const SizedBox(height: 12),
              StatusNotice(
                key: const ValueKey('sync.unsaved'),
                tone: StatusTone.error,
                message: strings.text(
                  'sync.unsaved',
                  parameters: {'count': state.unsaved},
                ),
                liveRegion: true,
              ),
            ],
            if (state.nextRetry != null) ...[
              const SizedBox(height: 8),
              Text(
                strings.text(
                  'sync.retryAt',
                  parameters: {
                    'time': MaterialLocalizations.of(context).formatTimeOfDay(
                      TimeOfDay.fromDateTime(state.nextRetry!.toLocal()),
                    ),
                  },
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (state.status == FormativeSyncStatus.needsAuth)
              ActionButton(
                label: strings.text('sync.signIn'),
                onPressed: widget.onSignIn,
              )
            else if (!state.actor.isGuest || state.unsaved > 0)
              ActionButton(
                key: const ValueKey('sync.retry'),
                label: strings.text('sync.retry'),
                busy: busy,
                kind: ActionButtonKind.secondary,
                onPressed: state.status == FormativeSyncStatus.blocked
                    ? null
                    : () => widget.controller.wake(userInitiated: true),
              ),
            if (state.events.isNotEmpty) ...[
              const SizedBox(height: 20),
              for (final row in state.events) ...[
                GeoMathCard(
                  child: Row(
                    children: [
                      const Icon(Icons.schedule_rounded),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          strings.text(
                            row.event.kind == FormativeEventKind.module
                                ? 'sync.module'
                                : 'sync.solo',
                          ),
                        ),
                      ),
                      SyncStatusBadge(label: strings.text('sync.awaiting')),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
              ],
              if (state.pending > state.events.length)
                Text(
                  strings.text(
                    'sync.more',
                    parameters: {'count': state.events.length},
                  ),
                ),
            ],
            if (!state.actor.isGuest) ...[
              const SizedBox(height: 20),
              ActionButton(
                label: strings.text('sync.history'),
                onPressed: _loadHistory,
                busy: _loading && _historyActor == state.actor,
                kind: ActionButtonKind.tonal,
              ),
            ],
            if (history != null) ...[
              const SizedBox(height: 20),
              SectionHeader(title: strings.text('sync.historyTitle')),
              const SizedBox(height: 12),
              StatusNotice(message: strings.text('sync.historyNotice')),
              if (history.failureOrNull != null)
                Text(strings.text('sync.historyError'))
              else if (history.valueOrNull!.attempts.isEmpty)
                Text(strings.text('sync.historyEmpty'))
              else
                for (final record in history.valueOrNull!.attempts)
                  ListTile(
                    title: Text(
                      '${strings.text('sync.mode.${record.mode.name}')} · ${record.score}/${record.total}',
                    ),
                    subtitle: Text(strings.text('sync.solo')),
                  ),
            ],
          ],
        ),
      );
    },
  );
}
