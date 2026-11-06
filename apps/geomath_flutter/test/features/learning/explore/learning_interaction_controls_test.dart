import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/learning/learning_catalogue.dart';
import 'package:geomath_flutter/features/learning/learning_strings.dart';
import 'package:geomath_flutter/features/learning/presentation/learning_model_controls.dart';
import 'package:geomath_flutter/features/learning/presentation/learning_module_workspace.dart';
import 'package:geomath_flutter/features/learning/presentation/learning_shape_carousel.dart';

void main() {
  final options = [
    for (final id in LearningCatalogue.canonicalIds)
      ShapeOption(id: id, label: id),
  ];

  testWidgets(
    'swiping and arrows browse all eleven shapes before explicit selection',
    (tester) async {
      final selections = <String>[];
      await tester.pumpWidget(
        _host(
          LearningShapeCarousel(
            options: options,
            selectedId: 'cube',
            onSelected: selections.add,
          ),
        ),
      );
      await tester.drag(
        find.byKey(const ValueKey('learning-shape-pages')),
        const Offset(-400, 0),
      );
      await tester.pumpAndSettle();
      expect(find.text('Shape 2 of 11'), findsOneWidget);
      expect(selections, isEmpty);
      await tester.tap(find.byKey(const ValueKey('learning-shape-select')));
      expect(selections, ['cuboid']);
      for (var position = 3; position <= 11; position++) {
        await tester.tap(find.byKey(const ValueKey('learning-shape-next')));
        await tester.pumpAndSettle();
        expect(find.text('Shape $position of 11'), findsOneWidget);
      }
      expect(selections, ['cuboid']);
      expect(
        tester
            .widget<IconButton>(
              find.byKey(const ValueKey('learning-shape-next')),
            )
            .onPressed,
        isNull,
      );
      await tester.tap(find.byKey(const ValueKey('learning-shape-select')));
      expect(selections, ['cuboid', 'hemisphere']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('shape browsing survives theme and 150% text at 320dp', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final catalogue = await LearningCatalogue.load();
    var dark = false;
    late StateSetter update;
    await tester.pumpWidget(
      StatefulBuilder(
        builder: (context, setState) {
          update = setState;
          return _host(
            Builder(
              builder: (context) => LearningShapeCarousel(
                options: [
                  for (final model in catalogue.models)
                    ShapeOption(
                      id: model.id,
                      label: model.localizedName(AppStrings.of(context)),
                    ),
                ],
                selectedId: 'cube',
                onSelected: (_) {},
              ),
            ),
            dark: dark,
            language: dark ? AppLanguage.ms : AppLanguage.en,
            scale: 1.5,
          );
        },
      ),
    );
    for (var i = 0; i < 6; i++) {
      await tester.tap(find.byKey(const ValueKey('learning-shape-next')));
      await tester.pumpAndSettle();
    }
    expect(find.text('Shape 7 of 11'), findsOneWidget);
    update(() => dark = true);
    await tester.pumpAndSettle();
    expect(find.text('Bentuk 7 daripada 11'), findsOneWidget);
    expect(find.text('Piramid bertapak segi tiga'), findsOneWidget);
    for (final key in [
      'learning-shape-previous',
      'learning-shape-next',
      'learning-shape-select',
    ]) {
      final size = tester.getSize(find.byKey(ValueKey(key)));
      expect(size.height, greaterThanOrEqualTo(48));
      expect(size.width, greaterThanOrEqualTo(48));
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('fold slider coalesces movement and commits the latest value', (
    tester,
  ) async {
    final writes = <double>[];
    final first = Completer<bool>();
    await tester.pumpWidget(
      _host(
        LearningUnfoldControl(
          shapeId: 'cube',
          progress: .2,
          onChanged: (value) {
            writes.add(value);
            return writes.length == 1 ? first.future : Future.value(true);
          },
        ),
      ),
    );
    final slider = tester.widget<Slider>(find.byType(Slider));
    slider.onChangeStart?.call(.2);
    slider.onChanged!.call(.3);
    slider.onChanged!.call(.5);
    slider.onChanged!.call(.8);
    slider.onChangeEnd?.call(.8);
    await tester.pump();
    expect(writes, [.3]);
    expect(tester.widget<Slider>(find.byType(Slider)).value, .8);
    first.complete(true);
    await tester.pumpAndSettle();
    expect(writes, [.3, .8]);
    expect(tester.widget<Slider>(find.byType(Slider)).value, .2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('sphere and hemisphere never offer a fabricated fold', (
    tester,
  ) async {
    final writes = <double>[];
    for (final shape in ['sphere', 'hemisphere']) {
      await tester.pumpWidget(
        _host(
          LearningUnfoldControl(
            shapeId: shape,
            progress: 0,
            onChanged: (value) async {
              writes.add(value);
              return true;
            },
          ),
        ),
      );
      expect(find.byType(Slider), findsNothing);
      expect(
        find.text('This shape’s curved surface has no exact flat net.'),
        findsOneWidget,
      );
    }
    expect(writes, isEmpty);
  });

  testWidgets(
    'a model change drops queued slider movement from the previous shape',
    (tester) async {
      final writes = <double>[];
      final first = Completer<bool>();
      var shape = 'cube';
      late StateSetter update;
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            update = setState;
            return _host(
              LearningUnfoldControl(
                shapeId: shape,
                progress: 0,
                onChanged: (value) {
                  writes.add(value);
                  return first.future;
                },
              ),
            );
          },
        ),
      );
      final slider = tester.widget<Slider>(find.byType(Slider));
      slider.onChanged!.call(.3);
      slider.onChanged!.call(.8);
      update(() => shape = 'sphere');
      await tester.pump();
      first.complete(true);
      await tester.pumpAndSettle();
      expect(writes, [.3]);
      expect(find.byType(Slider), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'slider gestures and endpoint buttons stay within the canonical range',
    (tester) async {
      final writes = <double>[];
      var progress = 0.0;
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) => _host(
            LearningUnfoldControl(
              shapeId: 'cube',
              progress: progress,
              onChanged: (value) async {
                writes.add(value);
                setState(() => progress = value);
                return true;
              },
            ),
          ),
        ),
      );
      await tester.drag(find.byType(Slider), const Offset(180, 0));
      await tester.pumpAndSettle();
      expect(writes, isNotEmpty);
      expect(writes.every((value) => value >= 0 && value <= 1), isTrue);
      await tester.tap(find.byKey(const ValueKey('learning-fold-closed')));
      await tester.pumpAndSettle();
      expect(writes.last, 0);
      expect(tester.widget<Slider>(find.byType(Slider)).value, 0);
      await tester.tap(find.byKey(const ValueKey('learning-fold-open')));
      await tester.pumpAndSettle();
      expect(writes.last, 1);
      expect(tester.widget<Slider>(find.byType(Slider)).value, 1);
    },
  );

  testWidgets('camera and panel controls dispatch real additive actions', (
    tester,
  ) async {
    final actions = <Map<String, Object?>>[];
    await tester.pumpWidget(
      _host(
        LearningCameraControls(
          onAction: (action) async {
            actions.add(action);
            return true;
          },
        ),
      ),
    );
    for (final view in [
      'front',
      'back',
      'left',
      'right',
      'top',
      'bottom',
      'isometric',
    ]) {
      final preset = find.byKey(ValueKey('learning-preset-$view'));
      await tester.ensureVisible(preset);
      await tester.tap(preset);
      await tester.pump();
      expect(actions.last, {'action': 'preset', 'view': view});
    }
    for (final (key, expected) in [
      ('zoom-out', {'action': 'zoom', 'delta': -.15}),
      ('reset', {'action': 'reset'}),
      ('panel-notes', {'action': 'panel', 'panel': 'notes'}),
      ('panel-calculator', {'action': 'panel', 'panel': 'calculator'}),
      ('panel-close', {'action': 'panel', 'panel': 'none'}),
    ]) {
      final button = find.byKey(ValueKey('model-action-$key'));
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pump();
      expect(actions.last, expected);
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'width and theme changes retain the same mounted activity and draft',
    (tester) async {
      var mounts = 0;
      var dark = false;
      late StateSetter update;
      tester.view.physicalSize = const Size(390, 780);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            update = setState;
            return _host(
              LearningModuleWorkspace(
                controls: const SizedBox(
                  key: ValueKey('workspace-controls-probe'),
                  child: Text('Controls'),
                ),
                activity: _ActivityProbe(onMount: () => mounts++),
              ),
              dark: dark,
              scrollable: false,
              scale: 1.5,
            );
          },
        ),
      );
      await tester.enterText(find.byType(TextField), 'a = 4 cm');
      await tester.tap(find.text('Rotate camera'));
      // A 768dp tablet leaves about 644dp after its native navigation rail.
      for (final width in [768.0, 644.0, 640.0, 639.0, 430.0, 320.0, 390.0]) {
        tester.view.physicalSize = Size(width, 780);
        update(() => dark = !dark);
        await tester.pumpAndSettle();
        expect(find.text('a = 4 cm'), findsOneWidget);
        expect(find.text('Camera 1'), findsOneWidget);
        expect(mounts, 1);
        final layout = tester.widget<Flex>(
          find
              .descendant(
                of: find.byType(LearningModuleWorkspace),
                matching: find.byType(Flex),
              )
              .first,
        );
        expect(
          layout.direction,
          width >= 640 ? Axis.horizontal : Axis.vertical,
        );
        if (width >= 640) {
          expect(
            tester
                .getSize(find.byKey(const ValueKey('workspace-controls-probe')))
                .width,
            width < 768 ? 280 : 320,
          );
          expect(
            tester.getSize(find.byType(_ActivityProbe)).width,
            greaterThanOrEqualTo(359),
          );
        }
        expect(tester.takeException(), isNull);
      }
    },
  );
}

Widget _host(
  Widget child, {
  bool dark = false,
  AppLanguage language = AppLanguage.en,
  double scale = 1,
  bool scrollable = true,
}) => AppStringsScope(
  strings: AppStrings(
    language,
    contributions: FeatureLocalizationRegistry([learningStrings]).translations,
  ),
  child: MaterialApp(
    theme: dark ? GeoMathTheme.dark() : GeoMathTheme.light(),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale), disableAnimations: true),
      child: child!,
    ),
    home: Scaffold(
      body: scrollable
          ? SingleChildScrollView(
              child: Padding(padding: const EdgeInsets.all(12), child: child),
            )
          : child,
    ),
  ),
);

class _ActivityProbe extends StatefulWidget {
  const _ActivityProbe({required this.onMount});
  final VoidCallback onMount;

  @override
  State<_ActivityProbe> createState() => _ActivityProbeState();
}

class _ActivityProbeState extends State<_ActivityProbe> {
  var camera = 0;

  @override
  void initState() {
    super.initState();
    widget.onMount();
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      const TextField(),
      Text('Camera $camera'),
      TextButton(
        onPressed: () => setState(() => camera++),
        child: const Text('Rotate camera'),
      ),
    ],
  );
}
