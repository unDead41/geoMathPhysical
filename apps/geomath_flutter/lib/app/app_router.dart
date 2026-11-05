import 'dart:async';

import 'package:flutter/material.dart';

import '../core/features/feature_contribution.dart';
import '../core/l10n/app_strings.dart';
import '../core/navigation/app_navigation.dart';
import '../core/widgets/widgets.dart';
import '../features/help/guide_screen.dart';
import '../features/help/help_screen.dart';
import '../features/help/report_screen.dart';
import '../features/home/home_screen.dart';
import '../features/home/module_preview_page.dart';
import '../features/preferences/preferences_screen.dart';
import 'app_dependencies.dart';

enum AppDestination { home, learn, play, classes, profile }

List<FeatureRoute> foundationRoutes() => [
  FeatureRoute(name: 'home', path: '/', builder: (_, _) => const HomeScreen()),
  FeatureRoute(
    name: 'guide',
    path: '/guide',
    builder: (_, _) => const GuideScreen(),
  ),
  FeatureRoute(
    name: 'preferences',
    path: '/settings',
    builder: (context, _) => PreferencesScreen(
      repository: AppScope.of(context).dependencies.preferences,
      onBack: () => AppScope.of(context).router.back(),
    ),
  ),
  FeatureRoute(
    name: 'help',
    path: '/help',
    builder: (_, _) => const HelpScreen(),
  ),
  FeatureRoute(
    name: 'report',
    path: '/report',
    showNavigation: false,
    builder: (_, _) => const ReportScreen(),
  ),
  FeatureRoute(
    name: 'module-spike',
    path: '/foundation/module-spike',
    showNavigation: false,
    builder: (_, _) => const ModulePreviewPage(),
  ),
  for (final destination in AppDestination.values.skip(1))
    FeatureRoute(
      name: 'foundation-${destination.name}',
      path: '/foundation/${destination.name}',
      builder: (_, _) => UninstalledFeatureScreen(destination: destination),
    ),
];

/// SDK Router + Navigator. Entries retain their keys and native WebView state
/// when utility pages, language, theme or text scaling change.
final class GeoMathRouter extends RouterDelegate<String>
    with ChangeNotifier, PopNavigatorRouterDelegateMixin<String> {
  GeoMathRouter(this.dependencies, {String initialRoute = 'home'})
    : navigation = AppNavigationController(
        routes: dependencies.composition.routes,
        initialRoute: initialRoute,
      ) {
    navigation.addListener(notifyListeners);
  }
  final AppDependencies dependencies;
  final AppNavigationController navigation;
  final GlobalKey<ReportScreenState> reportKey = GlobalKey();
  final _popups = _PopupObserver();
  @override
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  void open(String name, {Map<String, Object?> arguments = const {}}) {
    _location(dependencies.composition.routes[name], arguments);
    navigation.push(name, arguments: arguments);
  }

  void back() {
    _pop(BackOrigin.appBar);
  }

  Future<void> select(AppDestination destination) async {
    final paths = ['/', '/learn', '/play', '/classes', '/profile'];
    final installed = dependencies.composition.routes.byPath(
      paths[destination.index],
    );
    await navigation.requestReset(
      installed?.name ?? 'foundation-${destination.name}',
    );
  }

  AppDestination get destination {
    final route = navigation.current.route;
    for (final value in AppDestination.values.skip(1)) {
      final path = [
        '/',
        '/learn',
        '/play',
        '/classes',
        '/profile',
      ][value.index];
      if ((value == AppDestination.play && route.path.startsWith('/duel')) ||
          route.path.startsWith(path) ||
          route.name == 'foundation-${value.name}') {
        return value;
      }
    }
    return AppDestination.home;
  }

  @override
  String get currentConfiguration =>
      _location(navigation.current.route, navigation.current.arguments);
  String _location(FeatureRoute route, Map<String, Object?> arguments) => route
      .path
      .split('/')
      .map((segment) {
        if (!segment.startsWith(':')) return segment;
        final value = arguments[segment.substring(1)];
        if (value is! String || value.isEmpty) {
          throw ArgumentError('Missing route parameter: $segment');
        }
        return Uri.encodeComponent(value);
      })
      .join('/');
  @override
  Future<void> setNewRoutePath(String configuration) async {
    final match = dependencies.composition.routes.matchPath(configuration);
    if (match != null && configuration != currentConfiguration) {
      navigation.push(match.route.name, arguments: match.parameters);
    }
  }

  Future<bool>? _pendingPop;
  @override
  Future<bool> popRoute() => _pop(BackOrigin.system);
  Future<bool> _pop(BackOrigin origin) {
    if (_pendingPop case final pending?) return pending;
    final completion = Completer<bool>();
    _pendingPop = completion.future;
    Future<void>(() async {
      try {
        completion.complete(await _handlePop(origin));
      } catch (error, stack) {
        completion.completeError(error, stack);
      } finally {
        _pendingPop = null;
      }
    });
    return completion.future;
  }

  Future<bool> _handlePop(BackOrigin origin) async {
    if (_popups.hasPopup) {
      navigatorKey.currentState!.pop();
      return true;
    }
    final instance = navigation.current.instance;
    if (navigation.current.route.name == 'report' &&
        !(await reportKey.currentState?.confirmLeave() ?? true)) {
      return true;
    }
    if (navigation.current.instance != instance) return true;
    final result = await navigation.requestBack(origin);
    if (result == BackOutcome.atRoot &&
        navigation.current.route.name != 'home') {
      navigation.reset('home');
      return true;
    }
    return result != BackOutcome.atRoot;
  }

  @override
  Widget build(BuildContext context) => AppScope(
    dependencies: dependencies,
    router: this,
    child: Navigator(
      key: navigatorKey,
      observers: [_popups],
      pages: [
        for (final entry in navigation.entries)
          MaterialPage<void>(
            key: ValueKey('route-${entry.instance}'),
            name: _location(entry.route, entry.arguments),
            canPop: false,
            onPopInvoked: (didPop, _) {
              if (!didPop) _pop(BackOrigin.gesture);
            },
            child: AppRouteScope(
              entry: entry,
              isCurrent: navigation.current.instance == entry.instance,
              child: Builder(
                builder: (routeContext) => Scaffold(
                  body: entry.route.name == 'report'
                      ? ReportScreen(key: reportKey)
                      : entry.route.builder(
                          routeContext,
                          dependencies.composition.services,
                        ),
                  bottomNavigationBar: entry.route.showNavigation
                      ? _destinationNav(routeContext)
                      : null,
                ),
              ),
            ),
          ),
      ],
      // Pages leave only when the navigation controller removes their entries.
      onDidRemovePage: (_) {},
    ),
  );

  Widget _destinationNav(BuildContext context) => SafeArea(
    top: false,
    child: NavigationBar(
      selectedIndex: destination.index,
      onDestinationSelected: (index) => select(AppDestination.values[index]),
      destinations: [
        for (final item in [
          ('home', Icons.home_outlined, Icons.home_rounded),
          ('learn', Icons.view_in_ar_outlined, Icons.view_in_ar_rounded),
          ('play', Icons.sports_esports_outlined, Icons.sports_esports_rounded),
          ('classes', Icons.groups_outlined, Icons.groups_rounded),
          ('profile', Icons.person_outline_rounded, Icons.person_rounded),
        ])
          NavigationDestination(
            key: ValueKey('nav-${item.$1}'),
            icon: Icon(item.$2),
            selectedIcon: Icon(item.$3),
            label: AppStrings.of(context).text(
              item.$1 == 'classes' && MediaQuery.sizeOf(context).width < 360
                  ? 'foundation.navClassCompact'
                  : 'nav.${item.$1}',
            ),
          ),
      ],
    ),
  );

  @override
  void dispose() {
    navigation.removeListener(notifyListeners);
    navigation.dispose();
    super.dispose();
  }
}

/// Pageless dialogs/sheets close before the underlying guarded activity.
class _PopupObserver extends NavigatorObserver {
  final _routes = <Route<dynamic>>[];
  bool get hasPopup => _routes.any((route) => route.isCurrent);
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route.settings is! Page) _routes.add(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _routes.remove(route);
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _routes.remove(route);
  }
}

final class GeoMathRouteParser extends RouteInformationParser<String> {
  const GeoMathRouteParser();
  @override
  Future<String> parseRouteInformation(
    RouteInformation routeInformation,
  ) async => routeInformation.uri.path;
  @override
  RouteInformation restoreRouteInformation(String configuration) =>
      RouteInformation(uri: Uri(path: configuration));
}

class UninstalledFeatureScreen extends StatelessWidget {
  const UninstalledFeatureScreen({super.key, required this.destination});
  final AppDestination destination;
  @override
  Widget build(BuildContext context) {
    final s = AppStrings.of(context);
    final router = AppScope.of(context).router;
    return GeoMathScaffold(
      title: s.text('foundation.${destination.name}'),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          EmptyState(
            title: s.text('foundation.incomplete'),
            message: s.text('foundation.incompleteBody'),
            icon: Icons.construction_rounded,
          ),
          if (destination == AppDestination.learn) ...[
            const SizedBox(height: 20),
            ActionButton(
              key: const ValueKey('open-module-spike'),
              label: s.text('foundation.explore'),
              icon: Icons.view_in_ar_rounded,
              onPressed: () => router.open('module-spike'),
            ),
          ],
          const SizedBox(height: 12),
          ActionButton(
            label: s.text('foundation.help'),
            kind: ActionButtonKind.secondary,
            onPressed: () => router.open('help'),
          ),
        ],
      ),
    );
  }
}
