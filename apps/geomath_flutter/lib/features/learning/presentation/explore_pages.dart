import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';
import '../learning_catalogue.dart';
import 'learning_module_page.dart';

final class LearningExplorePage extends StatelessWidget {
  const LearningExplorePage({this.shapeId = 'cube', super.key});

  final String shapeId;

  @override
  Widget build(BuildContext context) => _CatalogueModule(
    section: 'explore',
    titleKey: 'learning.exploreTitle',
    introKey: 'learning.exploreIntro',
    shapeId: shapeId,
  );
}

final class LearningViewsPage extends StatelessWidget {
  const LearningViewsPage({this.shapeId = 'cube', super.key});

  final String shapeId;

  @override
  Widget build(BuildContext context) => _CatalogueModule(
    section: 'views',
    titleKey: 'learning.viewsTitle',
    introKey: 'learning.viewsIntro',
    shapeId: shapeId,
  );
}

final class LearningNotesPage extends StatelessWidget {
  const LearningNotesPage({required this.shapeId, super.key});

  final String shapeId;

  @override
  Widget build(BuildContext context) => _CatalogueModule(
    section: 'notes',
    titleKey: 'learning.notesTitle',
    introKey: 'learning.notesIntro',
    shapeId: shapeId,
  );
}

final class LearningCalculatorPage extends StatelessWidget {
  const LearningCalculatorPage({required this.shapeId, super.key});

  final String shapeId;

  @override
  Widget build(BuildContext context) => _CatalogueModule(
    section: 'calculator',
    titleKey: 'learning.calculatorTitle',
    introKey: 'learning.calculatorIntro',
    shapeId: shapeId,
  );
}

/// Loading is outside the module so corrupt metadata cannot launch a guessed
/// shape. The future survives theme, language and text-size rebuilds.
final class _CatalogueModule extends StatefulWidget {
  const _CatalogueModule({
    required this.section,
    required this.titleKey,
    required this.introKey,
    required this.shapeId,
  });

  final String section;
  final String titleKey;
  final String introKey;
  final String shapeId;

  @override
  State<_CatalogueModule> createState() => _CatalogueModuleState();
}

final class _CatalogueModuleState extends State<_CatalogueModule> {
  Future<LearningCatalogue>? _catalogue;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _catalogue ??= LearningCatalogue.load(
      bundle: DefaultAssetBundle.of(context),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return FutureBuilder<LearningCatalogue>(
      future: _catalogue,
      builder: (context, snapshot) {
        final catalogue = snapshot.data;
        final model = catalogue?.model(widget.shapeId);
        if (catalogue != null && model != null) {
          return LearningModulePage(
            section: widget.section,
            titleKey: widget.titleKey,
            initialShape: model.id,
            header: Text(
              strings.text(widget.introKey),
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          );
        }
        return GeoMathScaffold(
          title: strings.text(widget.titleKey),
          showBackButton: true,
          onBack: () => AppScope.of(context).router.back(),
          body: snapshot.hasError
              ? RetryPanel(
                  title: strings.text('learning.catalogueErrorTitle'),
                  message: strings.text('learning.catalogueErrorBody'),
                  retryLabel: strings.text('common.retry'),
                  onRetry: () => setState(() {
                    _catalogue = LearningCatalogue.load(
                      bundle: DefaultAssetBundle.of(context),
                    );
                  }),
                )
              : catalogue == null
              ? StatusNotice(
                  message: strings.text('learning.loadingCatalogue'),
                  icon: Icons.hourglass_top_rounded,
                  liveRegion: true,
                )
              : EmptyState(
                  title: strings.text('learning.missingShapeTitle'),
                  message: strings.text('learning.missingShapeBody'),
                  icon: Icons.search_off_rounded,
                  action: ActionButton(
                    label: strings.text('learning.returnToExplore'),
                    onPressed: () =>
                        AppScope.of(context).router.open('learning'),
                    icon: Icons.view_in_ar_rounded,
                  ),
                ),
        );
      },
    );
  }
}
