import 'package:flutter/material.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';
import '../presentation/learning_module_page.dart';

/// Modes are launch context. The canonical activity remains the state owner.
class LearningNetPage extends StatelessWidget {
  const LearningNetPage({super.key, this.mode});

  final String? mode;

  @override
  Widget build(BuildContext context) => LearningModulePage(
    section: 'net',
    titleKey: 'learning.netTitle',
    mode: const {'gallery', 'editor', 'studio'}.contains(mode)
        ? mode
        : 'gallery',
    header: const _LabIntroduction(activity: 'net'),
  );
}

class LearningVolumePage extends StatelessWidget {
  const LearningVolumePage({super.key, this.mode});

  final String? mode;

  @override
  Widget build(BuildContext context) => LearningModulePage(
    section: 'volume',
    titleKey: 'learning.volumeTitle',
    mode: const {'compare', 'unit', 'cone', 'pyramid'}.contains(mode)
        ? mode
        : 'compare',
    header: const _LabIntroduction(activity: 'volume'),
  );
}

class _LabIntroduction extends StatelessWidget {
  const _LabIntroduction({required this.activity});

  final String activity;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return GeoMathCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(strings.text('learning_labs.${activity}Intro')),
          const SizedBox(height: 12),
          Text(
            strings.text('learning_labs.reflectionTitle'),
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            runSpacing: 6,
            children: [
              for (final phase in const [
                'prediction',
                'experiment',
                'check',
                'explanation',
              ])
                Text(
                  strings.text('learning_labs.$phase'),
                  style: Theme.of(context).textTheme.labelLarge,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            strings.text('learning_labs.${activity}GuidedScope'),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
