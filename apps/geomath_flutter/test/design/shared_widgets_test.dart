import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';

void main() {
  testWidgets('app bar renders the full text scale and wraps its title', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const title = 'Penerokaan model geometri pembelajaran';
    await tester.pumpWidget(
      MaterialApp(
        theme: GeoMathTheme.light(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(2.25)),
          child: child!,
        ),
        home: const GeoMathScaffold(title: title, body: Text('Activity')),
      ),
    );
    await tester.pumpAndSettle();
    final paragraph = tester.renderObject<RenderParagraph>(find.text(title));
    expect(paragraph.textScaler.scale(16), 36);
    expect(paragraph.softWrap, isTrue);
    expect(paragraph.overflow, TextOverflow.visible);
    expect(paragraph.didExceedMaxLines, isFalse);
    final boxes = paragraph.getBoxesForSelection(
      const TextSelection(baseOffset: 0, extentOffset: title.length),
    );
    expect(boxes.map((box) => box.top).toSet().length, greaterThan(1));
    expect(
      tester.getSize(find.byType(AppBar)).height,
      greaterThanOrEqualTo(paragraph.size.height),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'scroll storage stays independent of late and persisted expansion state',
    (tester) async {
      final bucket = PageStorageBucket();
      late StateSetter update;
      var generation = 0;
      var lateSection = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: GeoMathTheme.light(),
          home: PageStorage(
            bucket: bucket,
            child: StatefulBuilder(
              builder: (context, setState) {
                update = setState;
                return GeoMathScaffold(
                  key: ValueKey(generation),
                  title: 'Analysis',
                  body: Column(
                    children: [
                      const SizedBox(height: 500),
                      const ExpansionTile(
                        key: PageStorageKey('remembered-section'),
                        title: Text('Remembered section'),
                        children: [Text('Saved expanded content')],
                      ),
                      if (lateSection)
                        const ExpansionTile(
                          key: ValueKey('late-analysis-section'),
                          title: Text('Late analysis section'),
                          children: [Text('Late expanded content')],
                        ),
                      const SizedBox(height: 1500),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      );
      await tester.ensureVisible(find.text('Remembered section'));
      await tester.tap(find.text('Remembered section'));
      await tester.pumpAndSettle();
      expect(find.text('Saved expanded content'), findsOneWidget);
      final scroll = tester.state<ScrollableState>(find.byType(Scrollable));
      scroll.position.jumpTo(450);
      await tester.pumpAndSettle();
      update(() => lateSection = true);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Saved expanded content'), findsOneWidget);
      await tester.tap(find.text('Late analysis section'));
      await tester.pumpAndSettle();
      expect(find.text('Late expanded content'), findsOneWidget);
      await tester.tap(find.text('Late analysis section'));
      await tester.pumpAndSettle();
      expect(find.text('Late expanded content'), findsNothing);
      final offset = scroll.position.pixels;
      update(() => generation++);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Saved expanded content'), findsOneWidget);
      expect(
        tester.state<ScrollableState>(find.byType(Scrollable)).position.pixels,
        offset,
      );
      await tester.tap(find.text('Remembered section'));
      await tester.pumpAndSettle();
      expect(find.text('Saved expanded content'), findsNothing);
      await tester.tap(find.text('Remembered section'));
      await tester.pumpAndSettle();
      expect(find.text('Saved expanded content'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'loading and retry remain readable with reduced motion and large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var retries = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: GeoMathTheme.dark(strongContrast: true),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(2.25),
              disableAnimations: true,
            ),
            child: child!,
          ),
          home: GeoMathScaffold(
            title: 'Status penyimpanan',
            body: Column(
              children: [
                const LoadingState(
                  label: 'Sedang menyimpan',
                  message: 'Kekalkan draf sementara simpanan disahkan.',
                ),
                const SizedBox(height: 16),
                RetryPanel(
                  title: 'Belum disimpan',
                  message:
                      'Draf anda masih tersedia. Cuba lagi apabila bersedia.',
                  retryLabel: 'Cuba semula',
                  onRetry: () => retries++,
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<CircularProgressIndicator>(
              find.byType(CircularProgressIndicator),
            )
            .value,
        .5,
      );
      await tester.ensureVisible(find.text('Cuba semula'));
      await tester.tap(find.text('Cuba semula'));
      expect(retries, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'confirmation actions remain reachable with keyboard at 320 dp/150%',
    (tester) async {
      tester.view.physicalSize = const Size(320, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      bool? result;
      await tester.pumpWidget(
        MaterialApp(
          theme: GeoMathTheme.light(strongContrast: true),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(1.5),
              viewInsets: const EdgeInsets.only(bottom: 180),
            ),
            child: child!,
          ),
          home: Builder(
            builder: (context) => GeoMathScaffold(
              title: 'Pengesahan',
              body: ActionButton(
                label: 'Buka pengesahan',
                onPressed: () async {
                  result = await showGeoMathConfirmation(
                    context,
                    title: 'Keluar daripada aktiviti ini?',
                    message: 'Perubahan yang belum disimpan perlu disemak sebelum anda meneruskan aktiviti yang lain.',
                    confirmLabel: 'Keluar daripada aktiviti',
                    cancelLabel: 'Teruskan aktiviti ini',
                    danger: true,
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Buka pengesahan'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Teruskan aktiviti ini'));
      await tester.tap(find.text('Teruskan aktiviti ini'));
      await tester.pumpAndSettle();
      expect(result, isFalse);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'busy action is single flight and labeled field keeps its accessible name',
    (tester) async {
      var calls = 0;
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        MaterialApp(
          theme: GeoMathTheme.light(),
          home: GeoMathScaffold(
            title: 'Forms',
            body: Column(
              children: [
                const LabeledField(label: 'Nama kelas', hint: 'Masukkan nama'),
                ActionButton(
                  label: 'Simpan',
                  busy: true,
                  busyLabel: 'Sedang menyimpan',
                  onPressed: () => calls++,
                ),
              ],
            ),
          ),
        ),
      );
      expect(find.bySemanticsLabel(RegExp('Nama kelas')), findsWidgets);
      await tester.tap(find.text('Sedang menyimpan'));
      expect(calls, 0);
      semantics.dispose();
    },
  );

  testWidgets(
    'shape/model/face controls wrap at 320 dp and have tap alternatives',
    (tester) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      String? selected;
      var reset = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: GeoMathTheme.dark(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(1.5)),
            child: child!,
          ),
          home: GeoMathScaffold(
            title: 'Model',
            body: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShapeSelector(
                  options: const [
                    ShapeOption(id: 'cube', label: 'Kubus'),
                    ShapeOption(id: 'cone', label: 'Kon'),
                    ShapeOption(id: 'cylinder', label: 'Silinder'),
                  ],
                  selectedId: 'cube',
                  onSelected: (value) => selected = value,
                ),
                const SizedBox(height: 12),
                ModelToolbar(
                  actions: [
                    ModelToolbarAction(
                      id: 'reset',
                      label: 'Set semula model',
                      icon: Icons.restart_alt,
                      onPressed: () => reset++,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                FaceLegend(
                  entries: [
                    FaceLegendEntry(
                      id: 'front',
                      label: 'Depan',
                      color: FacePalette.forFace('cube', 0)!,
                    ),
                    FaceLegendEntry(
                      id: 'top',
                      label: 'Atas',
                      color: FacePalette.forFace('cube', 4)!,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
      await tester.tap(find.text('Kon'));
      await tester.tap(find.text('Set semula model'));
      expect(selected, 'cone');
      expect(reset, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
