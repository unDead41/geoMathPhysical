import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/design/design.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';

/// Native activity discovery; the destination module owns each experiment.
class LearningLabsHub extends StatelessWidget {
  const LearningLabsHub({super.key, this.onOpen, this.onBack});

  final void Function(String routeName, Map<String, Object?> arguments)? onOpen;
  final VoidCallback? onBack;

  void _open(BuildContext context, String route, [String? mode]) {
    final arguments = <String, Object?>{'mode': ?mode};
    if (onOpen case final open?) {
      open(route, arguments);
    } else {
      AppScope.of(context).router.open(route, arguments: arguments);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return GeoMathScaffold(
      title: strings.text('learning.labsTitle'),
      subtitle: strings.text('learning_labs.hubIntro'),
      showBackButton: true,
      onBack: onBack ?? () => AppScope.of(context).router.back(),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionHeader(
            title: strings.text('learning_labs.activitiesTitle'),
            subtitle: strings.text('learning_labs.activitiesBody'),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final textScale = MediaQuery.textScalerOf(context).scale(16) / 16;
              final columns = constraints.maxWidth / textScale >= 620 ? 2 : 1;
              final width =
                  (constraints.maxWidth - 16 * (columns - 1)) / columns;
              return Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  for (final lab in _labs)
                    SizedBox(
                      width: width,
                      child: _LabCard(
                        lab: lab,
                        onOpen: (mode) => _open(context, lab.route, mode),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 28),
          SectionHeader(
            title: strings.text('learning_labs.moreTitle'),
            subtitle: strings.text('learning_labs.moreBody'),
          ),
          const SizedBox(height: 16),
          for (final item in const [
            ('projection', 'learning-projection', Icons.architecture_rounded),
            ('calculation', 'learning-calculation', Icons.calculate_outlined),
            ('records', 'learning-records', Icons.menu_book_outlined),
          ]) ...[
            ActionButton(
              key: ValueKey('lab-shortcut-${item.$1}'),
              label: strings.text('learning_labs.${item.$1}'),
              icon: item.$3,
              kind: ActionButtonKind.secondary,
              onPressed: () => _open(context, item.$2),
            ),
            const SizedBox(height: 10),
          ],
          const SizedBox(height: 16),
          StatusNotice(
            title: strings.text('learning_labs.reflectionTitle'),
            message: strings.text('learning_labs.reflectionScope'),
            tone: StatusTone.neutral,
          ),
        ],
      ),
    );
  }
}

class _LabCard extends StatelessWidget {
  const _LabCard({required this.lab, required this.onOpen});

  final _Lab lab;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    final colors = GeoMathColors.of(context);
    return GeoMathCard(
      key: ValueKey('lab-card-${lab.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ExcludeSemantics(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: colors.infoContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Icon(lab.icon, color: colors.primary, size: 26),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    strings.text('learning.${lab.id}Title'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(strings.text('learning_labs.${lab.id}Summary')),
          const SizedBox(height: 18),
          for (final (index, mode) in lab.modes.indexed) ...[
            if (index > 0) const SizedBox(height: 10),
            ActionButton(
              key: ValueKey('lab-launch-${lab.id}-$mode'),
              label: strings.text('learning_labs.$mode'),
              kind: index == 0
                  ? ActionButtonKind.primary
                  : ActionButtonKind.secondary,
              onPressed: () => onOpen(mode),
            ),
          ],
        ],
      ),
    );
  }
}

class _Lab {
  const _Lab(this.id, this.route, this.icon, this.modes);

  final String id;
  final String route;
  final IconData icon;
  final List<String> modes;
}

const _labs = [
  _Lab('net', 'learning-net', Icons.polyline_outlined, [
    'gallery',
    'editor',
    'studio',
  ]),
  _Lab('volume', 'learning-volume', Icons.water_drop_outlined, [
    'compare',
    'unit',
    'cone',
    'pyramid',
  ]),
  _Lab('area', 'learning-area', Icons.grid_on_rounded, [
    'closed',
    'container',
    'cavity',
  ]),
  _Lab('composite', 'learning-composite', Icons.join_inner_rounded, [
    'roof',
    'rocket',
  ]),
];
