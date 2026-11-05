import 'package:flutter/material.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';
import '../presentation/learning_module_page.dart';

/// Screen 31: native mode selection around the canonical area activity.
class LearningAreaPage extends StatefulWidget {
  const LearningAreaPage({this.mode, super.key});

  final String? mode;

  @override
  State<LearningAreaPage> createState() => _LearningAreaPageState();
}

class _LearningAreaPageState extends State<LearningAreaPage> {
  late String _mode = _areaMode(widget.mode);

  @override
  void didUpdateWidget(covariant LearningAreaPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mode != widget.mode) _mode = _areaMode(widget.mode);
  }

  @override
  Widget build(BuildContext context) => LearningModulePage(
    section: 'area',
    titleKey: 'learning.areaTitle',
    mode: _mode,
    header: LearningSurfaceHeader(
      mode: _mode,
      composite: false,
      onModeChanged: (mode) => setState(() => _mode = mode),
    ),
  );
}

/// Screen 32: both canonical full-base composite models, without a math port.
class LearningCompositePage extends StatefulWidget {
  const LearningCompositePage({this.mode, super.key});

  final String? mode;

  @override
  State<LearningCompositePage> createState() => _LearningCompositePageState();
}

class _LearningCompositePageState extends State<LearningCompositePage> {
  late String _mode = _compositeMode(widget.mode);

  @override
  void didUpdateWidget(covariant LearningCompositePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mode != widget.mode) _mode = _compositeMode(widget.mode);
  }

  @override
  Widget build(BuildContext context) => LearningModulePage(
    section: 'composite',
    titleKey: 'learning.compositeTitle',
    mode: _mode,
    header: LearningSurfaceHeader(
      mode: _mode,
      composite: true,
      onModeChanged: (mode) => setState(() => _mode = mode),
    ),
  );
}

String _areaMode(String? mode) =>
    const ['closed', 'container', 'cavity'].contains(mode) ? mode! : 'closed';

String _compositeMode(String? mode) =>
    const ['roof', 'rocket'].contains(mode) ? mode! : 'roof';

/// A compact native header. Actual experiments and completion gates live in
/// the source module; expanding guidance never changes its teaching state.
class LearningSurfaceHeader extends StatelessWidget {
  const LearningSurfaceHeader({
    required this.mode,
    required this.composite,
    required this.onModeChanged,
    super.key,
  });

  final String mode;
  final bool composite;
  final ValueChanged<String> onModeChanged;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    String text(String key) => strings.text('learning_surface.$key');
    final effectiveMode = composite ? _compositeMode(mode) : _areaMode(mode);
    final modes = composite
        ? const ['roof', 'rocket']
        : const ['closed', 'container', 'cavity'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            text(composite ? 'compositeMode' : 'areaMode'),
            style: Theme.of(context).textTheme.labelLarge,
          ),
        ),
        const SizedBox(height: 8),
        ChoiceChips<String>(
          key: ValueKey('surface-mode-${composite ? 'composite' : 'area'}'),
          options: [
            for (final mode in modes)
              ChoiceChipOption(value: mode, label: text(mode)),
          ],
          selected: effectiveMode,
          onSelected: onModeChanged,
        ),
        ExpansionTile(
          key: ValueKey(composite ? 'composite-guide' : 'area-guide'),
          tilePadding: EdgeInsets.zero,
          childrenPadding: const EdgeInsets.only(bottom: 12),
          title: Text(text('guide')),
          leading: const Icon(Icons.info_outline_rounded),
          children: [
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(text('${effectiveMode}Guide')),
            ),
            const SizedBox(height: 12),
            if (composite) ...[
              StatusNotice(message: text('interfaceRule')),
              const SizedBox(height: 12),
            ] else if (effectiveMode == 'closed') ...[
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(text('roundRule')),
              ),
              const SizedBox(height: 12),
            ],
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(text('units')),
            ),
            const SizedBox(height: 12),
            StatusNotice(
              title: text('reflection'),
              message:
                  '${text(composite ? 'compositeScope' : 'guidedScope')} '
                  '${text('selfReflection')}',
            ),
          ],
        ),
      ],
    );
  }
}
