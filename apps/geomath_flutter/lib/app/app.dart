import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/design/design.dart';
import '../core/features/feature_composition.dart';
import '../core/features/feature_contribution.dart';
import '../core/l10n/app_strings.dart';
import '../core/result.dart';
import '../core/widgets/geo_feedback.dart';
import 'app_dependencies.dart';
import 'app_router.dart';

class GeoMathApp extends StatefulWidget {
  const GeoMathApp({
    super.key,
    required this.dependencies,
    this.initialRoute = 'home',
    this.disposeDependencies = false,
  });
  final AppDependencies dependencies;
  final String initialRoute;
  final bool disposeDependencies;
  @override
  State<GeoMathApp> createState() => _GeoMathAppState();
}

class _GeoMathAppState extends State<GeoMathApp> with WidgetsBindingObserver {
  late GeoMathRouter router = GeoMathRouter(
    widget.dependencies,
    initialRoute: widget.initialRoute,
  );
  late PlatformRouteInformationProvider routeInformation =
      PlatformRouteInformationProvider(
        initialRouteInformation: RouteInformation(
          uri: Uri(path: router.currentConfiguration),
        ),
      );
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAccessibilityFeatures() => setState(() {});

  @override
  void didUpdateWidget(GeoMathApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(widget.dependencies, oldWidget.dependencies)) {
      routeInformation.dispose();
      router.dispose();
      if (oldWidget.disposeDependencies) {
        unawaited(oldWidget.dependencies.dispose());
      }
      router = GeoMathRouter(
        widget.dependencies,
        initialRoute: widget.initialRoute,
      );
      routeInformation = PlatformRouteInformationProvider(
        initialRouteInformation: RouteInformation(
          uri: Uri(path: router.currentConfiguration),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.dependencies.preferences,
    builder: (context, _) {
      final prefs = widget.dependencies.preferences.value;
      final reducedMotion =
          prefs.reducedMotion ||
          WidgetsBinding
              .instance
              .platformDispatcher
              .accessibilityFeatures
              .disableAnimations;
      final strings = AppStrings(
        prefs.language,
        contributions:
            widget.dependencies.composition.localizations.translations,
      );
      return FeatureCompositionScope(
        composition: widget.dependencies.composition,
        child: AppStringsScope(
          strings: strings,
          child: MaterialApp.router(
            title: 'GeoMath',
            debugShowCheckedModeBanner: false,
            theme: GeoMathTheme.light(strongContrast: prefs.strongContrast),
            darkTheme: GeoMathTheme.dark(strongContrast: prefs.strongContrast),
            themeMode: GeoMathTheme.mode(prefs.theme),
            themeAnimationDuration: reducedMotion
                ? Duration.zero
                : const Duration(milliseconds: 180),
            locale: strings.locale,
            supportedLocales: AppStrings.supportedLocales,
            localizationsDelegates: const [
              AppStrings.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            routerDelegate: router,
            routeInformationProvider: routeInformation,
            routeInformationParser: const GeoMathRouteParser(),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: GeoMathTextScaler(
                  system: MediaQuery.textScalerOf(context),
                  appScale: prefs.textScale,
                ),
                disableAnimations:
                    MediaQuery.disableAnimationsOf(context) ||
                    prefs.reducedMotion,
              ),
              child: GeoFeedbackPolicy(
                hapticsEnabled: prefs.hapticsEnabled,
                reducedMotion: reducedMotion,
                child: child!,
              ),
            ),
          ),
        ),
      );
    },
  );
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    routeInformation.dispose();
    router.dispose();
    if (widget.disposeDependencies) unawaited(widget.dependencies.dispose());
    super.dispose();
  }
}

/// Both feature entry points call this same bootstrap and pass contributions.
/// Prompt 2 owns dev/learning_main.dart; Prompt 3 owns dev/cloud_game_main.dart.
Future<void>? _bootstrapFlight;
Future<void> runGeoMath({
  List<FeatureContribution> features = const [],
  String initialRoute = 'home',
  Future<Result<void>> Function(AppDependencies)? initialize,
}) {
  if (_bootstrapFlight case final pending?) return pending;
  final completion = Completer<void>();
  _bootstrapFlight = completion.future;
  Future<void>(() async {
    try {
      await _bootstrap(features, initialRoute, initialize);
      completion.complete();
    } catch (error, stack) {
      completion.completeError(error, stack);
    } finally {
      _bootstrapFlight = null;
    }
  });
  return completion.future;
}

Future<void> _bootstrap(
  List<FeatureContribution> features,
  String initialRoute,
  Future<Result<void>> Function(AppDependencies)? initialize,
) async {
  WidgetsFlutterBinding.ensureInitialized();
  final result = await AppDependencies.bootstrap(features: features);
  switch (result) {
    case Success<AppDependencies>(:final value):
      final initialized = initialize == null
          ? const Success<void>(null)
          : await initialize(value);
      if (!initialized.isSuccess ||
          !value.composition.routes.contains(initialRoute)) {
        await value.dispose();
        runApp(
          BootstrapRecoveryApp(
            onRetry: () => runGeoMath(
              features: features,
              initialRoute: initialRoute,
              initialize: initialize,
            ),
          ),
        );
        return;
      }
      runApp(
        GeoMathApp(
          key: ObjectKey(value),
          dependencies: value,
          initialRoute: initialRoute,
          disposeDependencies: true,
        ),
      );
    case Failed<AppDependencies>():
      runApp(
        BootstrapRecoveryApp(
          onRetry: () => runGeoMath(
            features: features,
            initialRoute: initialRoute,
            initialize: initialize,
          ),
        ),
      );
  }
}

class BootstrapRecoveryApp extends StatefulWidget {
  const BootstrapRecoveryApp({super.key, required this.onRetry});
  final Future<void> Function() onRetry;
  @override
  State<BootstrapRecoveryApp> createState() => _BootstrapRecoveryAppState();
}

class _BootstrapRecoveryAppState extends State<BootstrapRecoveryApp> {
  bool retrying = false;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'GeoMath',
    theme: GeoMathTheme.light(),
    home: Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.storage_rounded, size: 48),
                const SizedBox(height: 24),
                const Text(
                  'GeoMath',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'GeoMath belum dapat dimulakan. Cuba semula untuk memulihkan simpanan dan sesi.\n\nGeoMath could not start. Retry to restore device storage and session.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: retrying
                      ? null
                      : () async {
                          setState(() => retrying = true);
                          try {
                            await widget.onRetry();
                          } finally {
                            if (mounted) setState(() => retrying = false);
                          }
                        },
                  child: const Text('Cuba semula / Try again'),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
