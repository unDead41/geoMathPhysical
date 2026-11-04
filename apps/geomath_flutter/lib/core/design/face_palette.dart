import 'package:flutter/material.dart';

/// Approved learning palette, deliberately separate from UI/status tokens.
/// Source: docs/geomath-app/face_colors.json schema 1. Keys describe physical
/// faces. Neither camera orientation nor unfolding changes this mapping.
abstract final class FacePalette {
  static const Map<int, Color> cubeAndCuboid = {
    0: Color(0xff4c8dff),
    1: Color(0xfff69b45),
    2: Color(0xffe9799b),
    3: Color(0xff42b883),
    4: Color(0xfff4c95d),
    5: Color(0xff9b7edc),
  };

  static const Map<int, String> semanticIds = {
    0: 'front',
    1: 'right',
    2: 'back',
    3: 'left',
    4: 'top',
    5: 'bottom',
  };

  /// A null return requires the shape's canonical surface adapter. Curved and
  /// prism models are never assigned six fictitious cube faces by this helper.
  static Color? forFace(String shape, int stableFaceId) {
    if (shape != 'cube' && shape != 'cuboid') return null;
    return cubeAndCuboid[stableFaceId];
  }
}
