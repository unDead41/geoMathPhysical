import 'package:flutter/widgets.dart';

import '../navigation/app_navigation.dart';
import '../storage/migration.dart';
import 'feature_localizations.dart';
import 'service_registry.dart';

export '../storage/migration.dart' show MigrationContribution;
export 'feature_localizations.dart';
export 'service_registry.dart';

typedef FeatureRouteBuilder = Widget Function(
  BuildContext context,
  ServiceRegistry services,
);

/// Route names and paths are stable identifiers, never authorization grants.
final class FeatureRoute {
  const FeatureRoute({
    required this.name,
    required this.path,
    required this.builder,
    this.backPolicy,
    this.showNavigation = true,
  });

  final String name;
  final String path;
  final FeatureRouteBuilder builder;
  final BackPolicy? backPolicy;
  final bool showNavigation;
}

final class FeatureRouteRegistry {
  FeatureRouteRegistry(Iterable<FeatureRoute> routes) {
    final paths = <String>{};
    for (final route in routes) {
      final segments = route.path.split('/').skip(1);
      final parameters = <String>{};
      if (route.name.trim().isEmpty ||
          !route.path.startsWith('/') ||
          route.path.contains('//') ||
          route.path.contains('?') ||
          route.path.contains('#') ||
          (route.path.length > 1 && route.path.endsWith('/'))) {
        throw ArgumentError('Invalid feature route: ${route.name}');
      }
      for (final segment in segments.where((s) => s.startsWith(':'))) {
        final parameter = segment.substring(1);
        if (!RegExp(r'^[A-Za-z][A-Za-z0-9_]*$').hasMatch(parameter) ||
            !parameters.add(parameter)) {
          throw ArgumentError('Invalid route parameter: $segment');
        }
      }
      if (_routes.containsKey(route.name)) {
        throw ArgumentError('Duplicate route name: ${route.name}');
      }
      final pattern = route.path
          .split('/')
          .map((s) => s.startsWith(':') ? ':' : s)
          .join('/');
      if (!paths.add(pattern)) {
        throw ArgumentError('Duplicate route path: ${route.path}');
      }
      _routes[route.name] = route;
    }
  }

  final Map<String, FeatureRoute> _routes = {};
  Iterable<FeatureRoute> get routes => List.unmodifiable(_routes.values);

  FeatureRoute operator [](String name) {
    final route = _routes[name];
    if (route == null) throw ArgumentError('Unknown route: $name');
    return route;
  }

  bool contains(String name) => _routes.containsKey(name);

  FeatureRoute? byPath(String path) {
    return matchPath(path)?.route;
  }

  FeatureRouteMatch? matchPath(String path) {
    Uri uri;
    try {
      uri = Uri.parse(path);
    } on FormatException {
      return null;
    }
    if (uri.hasScheme || uri.hasAuthority || uri.hasQuery || uri.hasFragment) {
      return null;
    }
    // Literal paths take precedence over parameters, e.g. /classes/new.
    for (final route in _routes.values) {
      if (route.path == path) return FeatureRouteMatch(route, const {});
    }
    for (final route in _routes.values) {
      final pattern = Uri.parse(route.path).pathSegments;
      final actual = uri.pathSegments;
      if (pattern.length != actual.length) continue;
      final parameters = <String, String>{};
      var matches = true;
      for (var i = 0; i < pattern.length; i++) {
        if (pattern[i].startsWith(':') && actual[i].isNotEmpty) {
          parameters[pattern[i].substring(1)] = actual[i];
        } else if (pattern[i] != actual[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return FeatureRouteMatch(route, parameters);
    }
    return null;
  }
}

final class FeatureRouteMatch {
  FeatureRouteMatch(this.route, Map<String, String> parameters)
    : parameters = Map.unmodifiable(parameters);
  final FeatureRoute route;
  final Map<String, String> parameters;
}

/// Feature-owned registrations consumed by production and preview roots alike.
final class FeatureContribution {
  FeatureContribution({
    required this.id,
    Iterable<FeatureRoute> routes = const [],
    Iterable<FeatureLocalizations> localizations = const [],
    Iterable<MigrationContribution> migrations = const [],
    Iterable<ServiceFactoryBase> services = const [],
  }) : routes = List.unmodifiable(routes),
       localizations = List.unmodifiable(localizations),
       migrations = List.unmodifiable(migrations),
       services = List.unmodifiable(services);

  final String id;
  final List<FeatureRoute> routes;
  final List<FeatureLocalizations> localizations;
  final List<MigrationContribution> migrations;
  final List<ServiceFactoryBase> services;
}
