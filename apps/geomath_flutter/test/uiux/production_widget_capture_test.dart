import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/cloud_game/support/cloud_game_test_support.dart';

const _outputPath = String.fromEnvironment('UIUX_CAPTURE_DIRECTORY');
const _fontPath = String.fromEnvironment('UIUX_FONT_DIRECTORY');
Map<String, Object?> _sourceMetadata = const {};

/// Opt-in host evidence from the installed composition and real native widgets.
/// No WebView, Android surface, hosted service, or physical device is simulated.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  setUpAll(() async {
    if (_outputPath.isEmpty) return;
    final head = await Process.run('git', ['rev-parse', 'HEAD']);
    final runtimeDiff = await Process.run('git', [
      'diff',
      '--name-only',
      'HEAD',
      '--',
      'lib',
      'assets',
      'pubspec.yaml',
      'pubspec.lock',
      'android',
    ]);
    final pubspec = await File('pubspec.yaml').readAsString();
    _sourceMetadata = {
      'git_head': head.exitCode == 0 ? (head.stdout as String).trim() : null,
      'tracked_runtime_diff': runtimeDiff.exitCode == 0
          ? (runtimeDiff.stdout as String)
                .trim()
                .split('\n')
                .where((p) => p.isNotEmpty)
                .toList()
          : null,
      'app_version': RegExp(
        r'^version:\s*(.+)$',
        multiLine: true,
      ).firstMatch(pubspec)?.group(1),
      'dart_version': Platform.version,
      'captured_at_utc': DateTime.now().toUtc().toIso8601String(),
    };
    if (_fontPath.isEmpty) {
      throw StateError('UIUX_FONT_DIRECTORY must contain SDK material_fonts.');
    }
    final roboto = FontLoader('Roboto');
    for (final name in [
      'Roboto-Regular.ttf',
      'Roboto-Medium.ttf',
      'Roboto-Bold.ttf',
      'Roboto-Black.ttf',
      'Roboto-Italic.ttf',
    ]) {
      roboto.addFont(_fontBytes('$_fontPath/$name'));
    }
    final icons = FontLoader('MaterialIcons')
      ..addFont(_fontBytes('$_fontPath/MaterialIcons-Regular.otf'));
    await roboto.load();
    await icons.load();
  });

  const routes = [
    'home',
    'learning',
    'cloud-game-play',
    'cloud-game-classes',
    'cloud-game-profile',
    'cloud-game-login',
    'preferences',
    'learning-records',
    'sync.pending',
  ];
  const sizes = [
    (width: 320.0, height: 900.0, systemTextScale: 1.0),
    (width: 390.0, height: 900.0, systemTextScale: 1.0),
    (width: 430.0, height: 900.0, systemTextScale: 1.0),
    (width: 768.0, height: 1024.0, systemTextScale: 1.0),
    (width: 800.0, height: 600.0, systemTextScale: 1.5),
  ];
  for (final size in sizes) {
    final width = size.width;
    for (final language in AppLanguage.values) {
      for (final theme in [AppTheme.light, AppTheme.dark]) {
        final composed = size.systemTextScale > 1;
        if (composed &&
            (language == AppLanguage.ms) != (theme == AppTheme.light)) {
          continue;
        }
        final effectiveTextScale = 1.5 * size.systemTextScale;
        final profile =
            '${width.toInt()}-${language.name}-${theme.name}-'
            '${(effectiveTextScale * 100).round()}'
            '${composed ? '-composed' : ''}';
        testWidgets('production host capture $profile', (tester) async {
          tester.view.physicalSize = Size(width, size.height);
          tester.view.devicePixelRatio = 1;
          tester.platformDispatcher.textScaleFactorTestValue =
              size.systemTextScale;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
          rootBundle.clear();
          final app = (await tester.runAsync(
            () => bootstrapCloudGameForTest(features: productionFeatures()),
          ))!;
          final boundaryKey = GlobalKey();
          final captures = <Map<String, Object?>>[];
          final semantics = tester.ensureSemantics();
          try {
            expect(
              (await tester.runAsync(() => initializeProduction(app)))!
                  .isSuccess,
              isTrue,
            );
            await tester.runAsync(
              () => app.preferences.save(
                app.preferences.value.copyWith(
                  language: language,
                  theme: theme,
                  textScale: 1.5,
                  reducedMotion: true,
                  musicEnabled: false,
                  soundEnabled: false,
                ),
              ),
            );
            await tester.pumpWidget(
              RepaintBoundary(
                key: boundaryKey,
                child: GeoMathApp(key: ObjectKey(app), dependencies: app),
              ),
            );
            await _settleIo(tester);
            final router = AppScope.of(
              tester.element(find.byType(GeoMathScaffold).first),
            ).router;
            final actor = app.sessions.current;
            for (final route in routes) {
              router.navigation.reset(route);
              await _settleIo(tester);
              expect(app.sessions.current, actor, reason: '$profile/$route');
              expect(
                tester.takeException(),
                isNull,
                reason: '$profile/$route failed before capture',
              );
              await expectLater(
                tester,
                meetsGuideline(androidTapTargetGuideline),
              );
              await expectLater(
                tester,
                meetsGuideline(labeledTapTargetGuideline),
              );
              await _capture(
                tester,
                boundaryKey,
                '$profile-$route-top.png',
                captures,
              );
              final scrollables = tester
                  .stateList<ScrollableState>(find.byType(Scrollable))
                  .where(
                    (state) =>
                        state.widget.axisDirection == AxisDirection.down &&
                        state.position.maxScrollExtent > 32,
                  );
              if (scrollables.isNotEmpty) {
                final position = scrollables.first.position;
                position.jumpTo(position.maxScrollExtent);
                await tester.pump();
                await _capture(
                  tester,
                  boundaryKey,
                  '$profile-$route-bottom.png',
                  captures,
                );
                expect(tester.takeException(), isNull);
              }
            }
            await tester.runAsync(() async {
              final output = Directory(_outputPath);
              await output.create(recursive: true);
              await File('${output.path}/$profile.json').writeAsString(
                const JsonEncoder.withIndent('  ').convert({
                  'evidence_kind': 'host-rendered-production-widgets',
                  'source': _sourceMetadata,
                  'profile': profile,
                  'logical_width': width,
                  'logical_height': size.height,
                  'app_text_scale': 1.5,
                  'system_text_scale': size.systemTextScale,
                  'text_scale': effectiveTextScale,
                  'actor': 'local guest',
                  'cloud': 'not configured',
                  'font_source': 'Flutter SDK Roboto and MaterialIcons',
                  'host_font_adaptation':
                      'Implicit paragraph families resolve to loaded Roboto',
                  'android_or_webview_evidence': false,
                  'captures': captures,
                }),
              );
            });
          } finally {
            semantics.dispose();
            await tester.pumpWidget(const SizedBox.shrink());
            await tester.runAsync(app.dispose);
          }
        }, skip: _outputPath.isEmpty);
      }
    }
  }
}

Future<ByteData> _fontBytes(String path) async {
  final bytes = await File(path).readAsBytes();
  return ByteData.sublistView(bytes);
}

Future<void> _settleIo(WidgetTester tester) async {
  for (var i = 0; i < 12; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.pump(const Duration(milliseconds: 50));
  }
}

/// Resolve the host engine's implicit test-font fallback as Android does.
/// This changes only the inherited font family for rasterization; the mounted
/// production widgets, state, explicit families, sizes and colors stay intact.
Future<void> _resolveImplicitHostFonts(WidgetTester tester) async {
  for (final paragraph
      in tester.allRenderObjects.whereType<RenderParagraph>()) {
    paragraph.text = TextSpan(
      style: const TextStyle(fontFamily: 'Roboto'),
      children: [paragraph.text],
    );
  }
  await tester.pump();
}

Future<void> _capture(
  WidgetTester tester,
  GlobalKey key,
  String filename,
  List<Map<String, Object?>> captures,
) async {
  await _resolveImplicitHostFonts(tester);
  final boundary =
      key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final bytes = (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    try {
      return (await image.toByteData(format: ui.ImageByteFormat.png))!.buffer
          .asUint8List();
    } finally {
      image.dispose();
    }
  }))!;
  await tester.runAsync(() async {
    final output = Directory(_outputPath);
    await output.create(recursive: true);
    await File('${output.path}/$filename').writeAsBytes(bytes, flush: true);
  });
  captures.add({
    'path': filename,
    'bytes': bytes.length,
    'sha256': sha256.convert(bytes).toString(),
  });
}
