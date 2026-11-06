import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/design/design.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';
import '../learning_catalogue.dart';
import 'learning_shape_carousel.dart';

/// The learning entry point is native; the canonical model opens on demand.
final class LearningHub extends StatefulWidget {
  const LearningHub({super.key});

  @override
  State<LearningHub> createState() => _LearningHubState();
}

final class _LearningHubState extends State<LearningHub> {
  Future<LearningCatalogue>? _catalogue;
  String _selectedShape = 'cube';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _catalogue ??= LearningCatalogue.load(
      bundle: DefaultAssetBundle.of(context),
    );
  }

  void _reload() => setState(() {
    _catalogue = LearningCatalogue.load(bundle: DefaultAssetBundle.of(context));
  });

  void _open(String route) =>
      AppScope.of(context).router
          .open(route, arguments: {'shapeId': _selectedShape});

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return GeoMathScaffold(
      title: strings.text('learning.title'),
      body: FutureBuilder<LearningCatalogue>(
        future: _catalogue,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return RetryPanel(
              title: strings.text('learning.catalogueErrorTitle'),
              message: strings.text('learning.catalogueErrorBody'),
              retryLabel: strings.text('common.retry'),
              onRetry: _reload,
            );
          }
          final catalogue = snapshot.data;
          if (catalogue == null) {
            return StatusNotice(
              message: strings.text('learning.loadingCatalogue'),
              icon: Icons.hourglass_top_rounded,
              liveRegion: true,
            );
          }
          final model =
              catalogue.model(_selectedShape) ?? catalogue.models.first;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _LearningHero(
                count: catalogue.models.length,
                onExplore: () => _open('learning-explore'),
              ),
              SizedBox(height: GeoMathSpacing.xl),
              SectionHeader(
                title: strings.text('learning.chooseShape'),
                subtitle: strings.text('learning.chooseShapeBody'),
              ),
              SizedBox(height: GeoMathSpacing.md),
              GeoMathCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    LearningShapeCarousel(
                      options: [
                        for (final item in catalogue.models)
                          ShapeOption(
                            id: item.id,
                            label: item.localizedName(strings),
                          ),
                      ],
                      selectedId: model.id,
                      onSelected: (id) => setState(() => _selectedShape = id),
                    ),
                    SizedBox(height: GeoMathSpacing.md),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        strings.text(
                          'learning.selectedShape',
                          parameters: {'shape': model.localizedName(strings)},
                        ),
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      strings.text(
                        'learning.shapeFacts',
                        parameters: {
                          'flat': model.flat,
                          'curved': model.curved,
                          'edges': model.edges,
                          'vertices': model.vertices,
                        },
                      ),
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: GeoMathColors.of(context).muted),
                    ),
                  ],
                ),
              ),
              SizedBox(height: GeoMathSpacing.xl),
              SectionHeader(
                title: strings.text('learning.toolsHeading'),
                subtitle: strings.text('learning.toolsBody'),
              ),
              SizedBox(height: GeoMathSpacing.md),
              _RouteCards(
                onOpen: _open,
                items: const [
                  _LearningLink(
                    'learning-views',
                    'viewsTitle',
                    'viewsDescription',
                    Icons.view_compact_alt_outlined,
                  ),
                  _LearningLink(
                    'learning-notes',
                    'notesTitle',
                    'notesDescription',
                    Icons.menu_book_rounded,
                  ),
                  _LearningLink(
                    'learning-calculator',
                    'calculatorTitle',
                    'calculatorDescription',
                    Icons.calculate_outlined,
                  ),
                ],
              ),
              SizedBox(height: GeoMathSpacing.xl),
              SectionHeader(
                title: strings.text('learning.labsHeading'),
                subtitle: strings.text('learning.labsBody'),
                trailing: ActionButton(
                  key: const ValueKey('learning-open-labs'),
                  label: strings.text('learning.allLabs'),
                  onPressed: () => _open('learning-labs'),
                  kind: ActionButtonKind.secondary,
                  expanded: false,
                  icon: Icons.science_outlined,
                ),
              ),
              SizedBox(height: GeoMathSpacing.md),
              _RouteCards(
                onOpen: _open,
                items: const [
                  _LearningLink(
                    'learning-net',
                    'netTitle',
                    'netDescription',
                    Icons.unfold_more_rounded,
                  ),
                  _LearningLink(
                    'learning-volume',
                    'volumeTitle',
                    'volumeDescription',
                    Icons.water_drop_outlined,
                  ),
                  _LearningLink(
                    'learning-area',
                    'areaTitle',
                    'areaDescription',
                    Icons.layers_outlined,
                  ),
                  _LearningLink(
                    'learning-composite',
                    'compositeTitle',
                    'compositeDescription',
                    Icons.widgets_outlined,
                  ),
                ],
              ),
              SizedBox(height: GeoMathSpacing.xl),
              SectionHeader(title: strings.text('learning.studiosHeading')),
              SizedBox(height: GeoMathSpacing.md),
              _RouteCards(
                onOpen: _open,
                items: const [
                  _LearningLink(
                    'learning-projection',
                    'projectionTitle',
                    'projectionDescription',
                    Icons.draw_outlined,
                  ),
                  _LearningLink(
                    'learning-calculation',
                    'calculationTitle',
                    'calculationDescription',
                    Icons.edit_note_rounded,
                  ),
                  _LearningLink(
                    'learning-records',
                    'recordsTitle',
                    'recordsDescription',
                    Icons.history_rounded,
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

final class _LearningHero extends StatelessWidget {
  const _LearningHero({required this.count, required this.onExplore});

  final int count;
  final VoidCallback onExplore;

  @override
  Widget build(BuildContext context) {
    final colors = GeoMathColors.of(context);
    final strings = AppStrings.of(context);
    final theme = Theme.of(context);
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.text('learning.heroEyebrow'),
          style: theme.textTheme.labelMedium?.copyWith(
            color: colors.primary,
            letterSpacing: 1.4,
          ),
        ),
        SizedBox(height: GeoMathSpacing.sm),
        Semantics(
          header: true,
          child: Text(
            strings.text('learning.heroTitle'),
            style: theme.textTheme.headlineMedium?.copyWith(
              color: colors.ink,
              fontWeight: FontWeight.w800,
              height: 1.15,
            ),
          ),
        ),
        SizedBox(height: GeoMathSpacing.md),
        Text(
          strings.text('learning.heroBody'),
          style: theme.textTheme.bodyLarge,
        ),
        SizedBox(height: GeoMathSpacing.md),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _HeroBadge(
              icon: Icons.view_in_ar_rounded,
              label: strings.text(
                'learning.modelCount',
                parameters: {'count': count},
              ),
            ),
            _HeroBadge(
              icon: Icons.offline_bolt_outlined,
              label: strings.text('learning.offlineReady'),
            ),
          ],
        ),
        SizedBox(height: GeoMathSpacing.lg),
        ActionButton(
          key: const ValueKey('learning-open-explore'),
          label: strings.text('learning.startExploring'),
          icon: Icons.arrow_forward_rounded,
          onPressed: onExplore,
        ),
      ],
    );
    return GeoMathCard(
      color: colors.infoContainer,
      padding: EdgeInsets.all(GeoMathSpacing.lg),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final wide =
              constraints.maxWidth >= 560 &&
              MediaQuery.textScalerOf(context).scale(16) <= 20;
          const illustration = ExcludeSemantics(
            child: GeoCubeIllustration(size: 156),
          );
          return wide
              ? Row(
                  children: [
                    Expanded(child: content),
                    SizedBox(width: GeoMathSpacing.xl),
                    illustration,
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Align(
                      alignment: Alignment.centerRight,
                      child: illustration,
                    ),
                    SizedBox(height: GeoMathSpacing.sm),
                    content,
                  ],
                );
        },
      ),
    );
  }
}

final class _HeroBadge extends StatelessWidget {
  const _HeroBadge({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      border: Border.all(color: GeoMathColors.of(context).border),
      borderRadius: BorderRadius.circular(GeoMathSpacing.controlRadius),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Text.rich(
        TextSpan(
          children: [
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: ExcludeSemantics(child: Icon(icon, size: 16)),
            ),
            const TextSpan(text: '  '),
            TextSpan(text: label),
          ],
        ),
        style: Theme.of(context).textTheme.labelMedium,
      ),
    ),
  );
}

final class _LearningLink {
  const _LearningLink(this.route, this.titleKey, this.bodyKey, this.icon);

  final String route;
  final String titleKey;
  final String bodyKey;
  final IconData icon;
}

final class _RouteCards extends StatelessWidget {
  const _RouteCards({required this.items, required this.onOpen});

  final List<_LearningLink> items;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final largeText = MediaQuery.textScalerOf(context).scale(16) > 20;
      final columns = largeText || constraints.maxWidth < 560
          ? 1
          : constraints.maxWidth >= 900 && items.length == 3
          ? 3
          : 2;
      final gap = GeoMathSpacing.md;
      final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
      final strings = AppStrings.of(context);
      final colors = GeoMathColors.of(context);
      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: [
          for (final item in items)
            SizedBox(
              width: width,
              child: GeoMathCard(
                key: ValueKey('learning-open-${item.route}'),
                color: colors.raised,
                onTap: () => onOpen(item.route),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        ExcludeSemantics(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: colors.infoContainer,
                              borderRadius: BorderRadius.circular(
                                GeoMathSpacing.controlRadius,
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Icon(item.icon, color: colors.primary),
                            ),
                          ),
                        ),
                        const Spacer(),
                        ExcludeSemantics(
                          child: Icon(
                            Icons.arrow_forward_rounded,
                            color: colors.muted,
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: GeoMathSpacing.md),
                    Text(
                      strings.text('learning.${item.titleKey}'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      strings.text('learning.${item.bodyKey}'),
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: colors.muted),
                    ),
                  ],
                ),
              ),
            ),
        ],
      );
    },
  );
}
