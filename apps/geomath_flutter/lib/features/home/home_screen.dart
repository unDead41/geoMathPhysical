import 'package:flutter/material.dart';

import '../../app/app_dependencies.dart';
import '../../app/app_router.dart';
import '../../core/design/design.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/widgets/widgets.dart';
import 'home_study_summary.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final s = AppStrings.of(context);
    final scope = AppScope.of(context);
    final colors = GeoMathColors.of(context);
    final installed = scope.dependencies.composition.routes.contains(
      'learning-explore',
    );
    return GeoMathScaffold(
      title: 'GeoMath',
      actions: [
        IconButton(
          key: const ValueKey('open-settings'),
          tooltip: s.text('foundation.settings'),
          icon: const Icon(Icons.tune_rounded),
          onPressed: () => scope.router.open('preferences'),
        ),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            s.text('foundation.hello'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          StreamBuilder(
            stream: scope.dependencies.sessions.bindings,
            builder: (context, _) => Text(
              scope.dependencies.sessions.current.isGuest
                  ? s.text('foundation.guest')
                  : s.text('foundation.signedIn'),
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: colors.muted),
            ),
          ),
          const SizedBox(height: 20),
          GeoMathCard(
            color: colors.infoContainer,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                LayoutBuilder(
                  builder: (context, c) => c.maxWidth >= 360
                      ? Row(
                          children: [
                            Expanded(child: _HeroText()),
                            const SizedBox(width: 12),
                            const GeoCubeIllustration(size: 132),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _HeroText(),
                            const Align(
                              alignment: Alignment.centerRight,
                              child: GeoCubeIllustration(size: 140),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: 18),
                ActionButton(
                  key: const ValueKey('home-explore'),
                  label: s.text('foundation.explore'),
                  icon: Icons.view_in_ar_rounded,
                  onPressed: () => scope.router.open(
                    installed ? 'learning-explore' : 'module-spike',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            s.text(
              installed ? 'foundation.offlineNote' : 'foundation.spikeNote',
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (installed) const HomeStudySummary(),
          const SizedBox(height: 24),
          SectionHeader(title: s.text('foundation.shortcuts')),
          const SizedBox(height: 12),
          for (final item in [
            (
              'play',
              'playBody',
              Icons.sports_esports_rounded,
              () => scope.router.select(AppDestination.play),
            ),
            (
              'classes',
              'classesBody',
              Icons.groups_rounded,
              () => scope.router.select(AppDestination.classes),
            ),
            (
              'guide',
              'guideBody',
              Icons.play_circle_outline_rounded,
              () => scope.router.open('guide'),
            ),
          ]) ...[
            GeoMathCard(
              padding: const EdgeInsets.all(4),
              child: ListTile(
                key: ValueKey('home-${item.$1}'),
                minVerticalPadding: 12,
                leading: Icon(item.$3, color: colors.primary),
                title: Text(
                  s.text('foundation.${item.$1}'),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                subtitle: Text(s.text('foundation.${item.$2}')),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: item.$4,
              ),
            ),
            const SizedBox(height: 10),
          ],
          ActionButton(
            key: const ValueKey('home-help'),
            label: s.text('foundation.help'),
            kind: ActionButtonKind.secondary,
            icon: Icons.help_outline_rounded,
            onPressed: () => scope.router.open('help'),
          ),
          const SizedBox(height: 20),
          Text(
            s.text(
              installed ? 'foundation.appVersion' : 'foundation.foundation',
            ),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelSmall
                ?.copyWith(color: colors.muted),
          ),
        ],
      ),
    );
  }
}

class _HeroText extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        AppStrings.of(context).text('foundation.hero'),
        style: Theme.of(context).textTheme.headlineLarge
            ?.copyWith(fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 12),
      Text(AppStrings.of(context).text('foundation.heroBody')),
    ],
  );
}
