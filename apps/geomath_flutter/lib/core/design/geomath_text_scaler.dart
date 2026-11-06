import 'package:flutter/painting.dart';

/// Adds the app's text preference to the platform's scaling strategy without
/// replacing or flattening the platform's nonlinear accessibility scaling.
final class GeoMathTextScaler extends TextScaler {
  const GeoMathTextScaler({required this.system, required this.appScale})
    : assert(appScale > 0);

  final TextScaler system;
  final double appScale;

  @override
  double scale(double fontSize) => system.scale(fontSize) * appScale;

  @override
  double get textScaleFactor => scale(14) / 14;

  @override
  bool operator ==(Object other) =>
      other is GeoMathTextScaler &&
      system == other.system &&
      appScale == other.appScale;

  @override
  int get hashCode => Object.hash(system, appScale);
}
