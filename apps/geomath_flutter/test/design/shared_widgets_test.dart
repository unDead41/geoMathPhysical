import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';

void main() {
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
