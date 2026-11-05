import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../storage/migration.dart';
import 'feature_contribution.dart';

/// The only registry aggregate. Feature previews use this same composition.
final class FeatureComposition {
  factory FeatureComposition(Iterable<FeatureContribution> contributions) {
    final features = List<FeatureContribution>.unmodifiable(contributions);
    final ids = <String>{};
    for (final feature in features) {
      if (!RegExp(r'^[a-z][a-z0-9_-]*$').hasMatch(feature.id)) {
        throw ArgumentError('Invalid feature id: ${feature.id}');
      }
      if (!ids.add(feature.id)) {
        throw ArgumentError('Duplicate feature: ${feature.id}');
      }
    }
    // Validation completes before the first service can be constructed.
    final routes = FeatureRouteRegistry(features.expand((f) => f.routes));
    final localizations = FeatureLocalizationRegistry(
      features.expand((f) => f.localizations),
    );
    final migrations = MigrationRegistry(features.expand((f) => f.migrations));
    final services = ServiceRegistry(features.expand((f) => f.services));
    return FeatureComposition._(
      features,
      routes,
      localizations,
      migrations,
      services,
    );
  }

  FeatureComposition._(
    this.features,
    this.routes,
    this.localizations,
    this.migrations,
    this.services,
  );

  final List<FeatureContribution> features;
  final FeatureRouteRegistry routes;
  final FeatureLocalizationRegistry localizations;
  final MigrationRegistry migrations;
  final ServiceRegistry services;

  void dispose() => services.dispose();
}

final class FeatureCompositionScope extends InheritedWidget {
  const FeatureCompositionScope({
    super.key,
    required this.composition,
    required super.child,
  });

  final FeatureComposition composition;

  static FeatureComposition of(BuildContext context) {
    final scope = context
        .dependOnInheritedWidgetOfExactType<FeatureCompositionScope>();
    assert(scope != null, 'Missing FeatureCompositionScope');
    return scope!.composition;
  }

  @override
  bool updateShouldNotify(FeatureCompositionScope oldWidget) =>
      composition != oldWidget.composition;
}

typedef FeatureRootBuilder = Widget Function(
  BuildContext context,
  FeatureComposition composition,
);

/// Adapter for `learning_main.dart` and `cloud_game_main.dart`.
///
/// The foundation exposes its normal app builder once. Preview entry points
/// supply additional contributions to this adapter, without editing that root,
/// router, localisation owner, or database registrations. The builder must apply
/// [FeatureComposition.migrations] before opening a feature's database services.
class FeaturePreview extends StatefulWidget {
  const FeaturePreview({
    super.key,
    this.foundation = const [],
    required this.contributions,
    required this.builder,
  });

  final List<FeatureContribution> foundation;
  final List<FeatureContribution> contributions;
  final FeatureRootBuilder builder;

  @override
  State<FeaturePreview> createState() => _FeaturePreviewState();
}

class _FeaturePreviewState extends State<FeaturePreview> {
  late FeatureComposition _composition = FeatureComposition([
    ...widget.foundation,
    ...widget.contributions,
  ]);

  @override
  void didUpdateWidget(FeaturePreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!listEquals(widget.foundation, oldWidget.foundation) ||
        !listEquals(widget.contributions, oldWidget.contributions)) {
      final next = FeatureComposition([
        ...widget.foundation,
        ...widget.contributions,
      ]);
      _composition.dispose();
      _composition = next;
    }
  }

  @override
  Widget build(BuildContext context) => FeatureCompositionScope(
    composition: _composition,
    child: Builder(builder: (context) => widget.builder(context, _composition)),
  );

  @override
  void dispose() {
    _composition.dispose();
    super.dispose();
  }
}
