import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';

void main() {
  test(
    'native semantic colours resolve canonical light/dark/strong tokens',
    () {
      expect(GeoMathTheme.light().colorScheme.primary, const Color(0xff215ff0));
      expect(
        GeoMathTheme.dark().scaffoldBackgroundColor,
        const Color(0xff101c29),
      );
      expect(
        GeoMathTheme.light(strongContrast: true)
            .extension<GeoMathColors>()!
            .border,
        const Color(0xff52657e),
      );
      expect(
        GeoMathTheme.dark(strongContrast: true).extension<GeoMathColors>()!.ink,
        const Color(0xfff8fafc),
      );
      expect(
        DesignTokens.sourceBlob,
        '94a77935bf3b9c67cf6c5cd5766bc677858b58b4',
      );
      expect(GeoMathSpacing.touchTarget, greaterThanOrEqualTo(48));
    },
  );

  test(
    'cube and cuboid palette binds physical IDs and rejects fictitious faces',
    () {
      const expected = [
        0xff4c8dff,
        0xfff69b45,
        0xffe9799b,
        0xff42b883,
        0xfff4c95d,
        0xff9b7edc,
      ];
      for (final shape in ['cube', 'cuboid']) {
        for (var id = 0; id < expected.length; id++) {
          expect(FacePalette.forFace(shape, id), Color(expected[id]));
        }
        expect(FacePalette.forFace(shape, 6), isNull);
      }
      for (final shape in [
        'pyramid',
        'cylinder',
        'cone',
        'sphere',
        'triangular-prism',
      ]) {
        expect(FacePalette.forFace(shape, 4), isNull);
      }
    },
  );

  test(
    'feature strings share one language owner with deterministic fallback',
    () {
      const strings = AppStrings(
        AppLanguage.ms,
        contributions: {
          'ms': {'learn.title': 'Teroka'},
          'en': {'learn.title': 'Explore', 'learn.onlyEnglish': 'Fallback'},
        },
      );
      expect(strings.text('learn.title'), 'Teroka');
      expect(strings.text('learn.onlyEnglish'), 'Fallback');
      expect(
        strings.text('unknown', fallback: 'Safe fallback'),
        'Safe fallback',
      );
      expect(strings.text('settings.title'), 'Tetapan');
      expect(
        const AppStrings(AppLanguage.en).text('settings.title'),
        'Settings',
      );
    },
  );

  test(
    'body text and status foregrounds remain readable in all four themes',
    () {
      for (final theme in [
        GeoMathTheme.light(),
        GeoMathTheme.dark(),
        GeoMathTheme.light(strongContrast: true),
        GeoMathTheme.dark(strongContrast: true),
      ]) {
        final colors = theme.extension<GeoMathColors>()!;
        expect(
          _contrast(colors.ink, theme.colorScheme.surface),
          greaterThanOrEqualTo(4.5),
        );
        expect(
          _contrast(colors.muted, theme.colorScheme.surface),
          greaterThanOrEqualTo(4.5),
        );
        expect(
          _contrast(colors.success, colors.successContainer),
          greaterThanOrEqualTo(4.5),
        );
        expect(
          _contrast(colors.warning, colors.warningContainer),
          greaterThanOrEqualTo(4.5),
        );
        expect(
          _contrast(theme.colorScheme.onPrimary, theme.colorScheme.primary),
          greaterThanOrEqualTo(4.5),
        );
        expect(
          _contrast(colors.onDangerFill, colors.dangerFill),
          greaterThanOrEqualTo(4.5),
        );
      }
    },
  );
}

double _contrast(Color first, Color second) {
  final a = first.computeLuminance();
  final b = second.computeLuminance();
  return (a > b ? a + .05 : b + .05) / (a > b ? b + .05 : a + .05);
}
