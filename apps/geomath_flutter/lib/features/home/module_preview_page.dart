import 'package:flutter/material.dart';

import '../../app/app_dependencies.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/module/module_host_bridge.dart';
import '../../core/navigation/app_navigation.dart';
import '../../core/records/formative_record.dart';
import '../../core/records/formative_records.dart';
import '../../core/result.dart';
import '../../core/widgets/widgets.dart';
import '../learning/module_spike_host.dart';

/// Foundation spike adapter; the complete native Learning UX belongs to Prompt 2.
class ModulePreviewPage extends StatefulWidget {
  const ModulePreviewPage({super.key});
  @override
  State<ModulePreviewPage> createState() => _ModulePreviewPageState();
}

class _ModulePreviewPageState extends State<ModulePreviewPage> {
  String? _recordNotice;
  bool _failed = false;

  Future<void> _command(ModuleCommand command) async {
    final scope = AppScope.of(context);
    final app = scope.dependencies;
    switch (command.kind) {
      case ModuleCommandKind.openSettings:
        scope.router.open('preferences');
      case ModuleCommandKind.openHelp:
        scope.router.open('help');
      case ModuleCommandKind.progress:
        final progress = command.progress!;
        final dto = ModuleReflection.fromJson({
          'activity': progress.activity,
          'stage': progress.stage,
          'prediction': progress.prediction,
          'result': progress.result,
          'explanation': progress.explanation,
          'completed': progress.completed,
        });
        final Result<DurableRecordReceipt> result;
        if (dto case Success<ModuleReflection>(:final value)) {
          result = await app.composition.services
              .get(FoundationServices.recordsWriter)
              .saveReflection(actor: command.binding, reflection: value);
        } else {
          result = Failed((dto as Failed<ModuleReflection>).failure);
        }
        if (!mounted ||
            !app.sessions.isCurrent(command.binding) ||
            !(AppRouteScope.maybeOf(context)?.isCurrent ?? true)) {
          return;
        }
        setState(() {
          _failed = result is Failed<DurableRecordReceipt>;
          _recordNotice = switch (result) {
            Success<DurableRecordReceipt>(:final value) =>
              value.state == FormativeSaveState.local
                  ? 'common.saved'
                  : 'foundation.pendingRecord',
            Failed<DurableRecordReceipt>() => 'foundation.recordFailed',
          };
        });
      case ModuleCommandKind.ready:
        break;
      case ModuleCommandKind.requestNavigation:
        final route = command.navigationRoute;
        final match = route == null
            ? null
            : app.composition.routes.matchPath(route);
        if (match != null) {
          scope.router.open(match.route.name, arguments: match.parameters);
        }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    final app = scope.dependencies;
    final s = AppStrings.of(context);
    return GeoMathScaffold(
      title: s.text('foundation.spike'),
      onBack: scope.router.back,
      scrollable: false,
      padding: EdgeInsets.zero,
      actions: [
        IconButton(
          key: const ValueKey('module-settings'),
          tooltip: s.text('foundation.settings'),
          icon: const Icon(Icons.tune_rounded),
          onPressed: () => scope.router.open('preferences'),
        ),
        IconButton(
          tooltip: s.text('foundation.help'),
          icon: const Icon(Icons.help_outline_rounded),
          onPressed: () => scope.router.open('help'),
        ),
      ],
      body: Column(
        children: [
          if (_recordNotice != null)
            Padding(
              padding: const EdgeInsets.all(8),
              child: StatusNotice(
                key: const ValueKey('module-record-status'),
                message: s.text(_recordNotice!),
                tone: _failed ? StatusTone.error : StatusTone.success,
                liveRegion: true,
              ),
            ),
          Expanded(
            child: ModuleSpikeScreen(
              embedded: true,
              sessions: app.sessions,
              lifecycle: app.lifecycle,
              audio: app.audio,
              preferences: app.preferences,
              onCommand: _command,
            ),
          ),
        ],
      ),
    );
  }
}
