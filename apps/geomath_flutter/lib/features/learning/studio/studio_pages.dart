import 'package:flutter/material.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';
import '../presentation/learning_module_page.dart';

/// Native context and navigation; the bundled canonical studio owns the drawing.
class LearningProjectionPage extends StatelessWidget {
  const LearningProjectionPage({super.key, this.initialShape = 'cube'});

  final String initialShape;

  static const projectShapes = {
    'cube',
    'cuboid',
    'pyramid',
    'cylinder',
    'cone',
    'assembly-step',
    'assembly-recess',
  };

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return LearningModulePage(
      section: 'projection',
      titleKey: 'learning.projectionTitle',
      initialShape: projectShapes.contains(initialShape)
          ? initialShape
          : 'cube',
      header: GeoMathCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(strings.text('learning_studio.projectionGuide')),
            const SizedBox(height: 8),
            Text(strings.text('learning_studio.projectionScale')),
          ],
        ),
      ),
    );
  }
}

/// The canonical parser and sequential checks remain inside the local WebView.
class LearningCalculationPage extends StatelessWidget {
  const LearningCalculationPage({super.key, this.initialShape = 'cube'});

  final String initialShape;

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return LearningModulePage(
      section: 'calculation',
      titleKey: 'learning.calculationTitle',
      initialShape: initialShape,
      header: GeoMathCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              header: true,
              child: Text(
                strings.text('learning_studio.calculationGuide'),
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            const SizedBox(height: 8),
            Text(strings.text('learning_studio.calculationScope')),
          ],
        ),
      ),
    );
  }
}
