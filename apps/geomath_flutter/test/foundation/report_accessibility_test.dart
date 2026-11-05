import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/widgets/confirmation_sheet.dart';
import 'package:geomath_flutter/features/help/local_report.dart';
import 'package:geomath_flutter/features/help/report_screen.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  sqfliteFfiInit();

  testWidgets(
    '320 dp / 150% report keeps keyboard and back actions reachable',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 640);
      addTearDown(tester.view.reset);
      final app = await _open(tester);
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'report'),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(
          find.byKey(const ValueKey('report-preview')),
        );
        await tester.tap(find.byKey(const ValueKey('report-preview')));
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('report-preview-text')), findsNothing);
        expect(
          find.text('Complete this field (at least 3 characters).'),
          findsNWidgets(4),
        );

        await _fill(tester);
        final description = _field('description');
        await tester.ensureVisible(description);
        await tester.showKeyboard(description);
        tester.view.viewInsets = const FakeViewPadding(bottom: 260);
        await tester.pump();
        expect(tester.testTextInput.isVisible, isTrue);
        expect(tester.takeException(), isNull);

        final firstBack = tester.binding.handlePopRoute();
        final repeatedBack = tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(find.byType(ConfirmationSheet), findsOneWidget);
        await tester.ensureVisible(find.text('Keep editing'));
        await tester.tap(find.text('Keep editing'));
        await tester.pumpAndSettle();
        await Future.wait([firstBack, repeatedBack]);
        expect(find.byType(ReportScreen), findsOneWidget);
        expect(find.byType(ConfirmationSheet), findsNothing);
        expect(
          tester.widget<TextFormField>(description).controller!.text,
          'Rotated net is unexpected. password=do-not-include-this-secret',
        );

        tester.view.viewInsets = const FakeViewPadding();
        tester.testTextInput.hide();
        await tester.pumpAndSettle();
        await tester.ensureVisible(
          find.byKey(const ValueKey('report-preview')),
        );
        await tester.tap(find.byKey(const ValueKey('report-preview')));
        await tester.pumpAndSettle();
        final text = tester.widget<SelectableText>(
          find.byKey(const ValueKey('report-preview-text')),
        );
        expect(text.data, contains('Rotate the cube and unfold its net.'));
        expect(text.data, contains('[REDACTED]'));
        expect(text.data, isNot(contains('do-not-include-this-secret')));
        expect(text.data, isNot(contains(app.sessions.current.sessionId)));
        await _showPreviewAction(tester, 'report-copy');
        expect(
          tester.getRect(find.byKey(const ValueKey('report-copy'))).height,
          greaterThanOrEqualTo(48),
        );
        await _showPreviewAction(tester, 'report-export');
        expect(
          tester.getRect(find.byKey(const ValueKey('report-export'))).height,
          greaterThanOrEqualTo(48),
        );
        final closePreview = tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(find.byType(ConfirmationSheet), findsNothing);
        expect(find.byKey(const ValueKey('report-preview-text')), findsNothing);
        expect(find.byType(ReportScreen), findsOneWidget);
        await closePreview;
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
      }
    },
  );

  testWidgets('failed TXT export retains draft and never claims saved', (
    tester,
  ) async {
    final app = await _open(
      tester,
      features: [
        FeatureContribution(
          id: 'qa_report_failure',
          routes: [
            FeatureRoute(
              name: 'qa-report',
              path: '/qa/report',
              showNavigation: false,
              builder: (_, _) => ReportScreen(exporter: _FailingExporter()),
            ),
          ],
        ),
      ],
    );
    try {
      await tester.pumpWidget(
        GeoMathApp(dependencies: app, initialRoute: 'qa-report'),
      );
      await tester.pumpAndSettle();
      await _fill(tester);
      await tester.ensureVisible(find.byKey(const ValueKey('report-preview')));
      await tester.tap(find.byKey(const ValueKey('report-preview')));
      await tester.pumpAndSettle();
      await _showPreviewAction(tester, 'report-export');
      await tester.tap(find.byKey(const ValueKey('report-export')));
      await tester.pumpAndSettle();
      expect(
        find.text('File has not been saved. Try again or copy the text.'),
        findsOneWidget,
      );
      expect(
        find.text('TXT file saved to your chosen location.'),
        findsNothing,
      );
      final state = tester.state<ReportScreenState>(find.byType(ReportScreen));
      expect(state.dirty, isTrue);
      expect(
        state.fields['steps']!.text,
        'Rotate the cube and unfold its net.',
      );
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    }
  });
}

Finder _field(String key) => find.descendant(
  of: find.byKey(ValueKey('report-$key')),
  matching: find.byType(TextFormField),
);

Future<void> _showPreviewAction(WidgetTester tester, String key) async {
  await tester.scrollUntilVisible(
    find.byKey(ValueKey(key)),
    180,
    scrollable: find
        .descendant(
          of: find.byType(DraggableScrollableSheet),
          matching: find.byType(Scrollable),
        )
        .first,
  );
}

Future<void> _fill(WidgetTester tester) async {
  for (final entry in const {
    'description':
        'Rotated net is unexpected. password=do-not-include-this-secret',
    'steps': 'Rotate the cube and unfold its net.',
    'expected': 'The original face identities stay attached.',
    'actual': 'One displayed face is unexpected.',
  }.entries) {
    await tester.ensureVisible(_field(entry.key));
    await tester.enterText(_field(entry.key), entry.value);
  }
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
}

Future<AppDependencies> _open(
  WidgetTester tester, {
  List<FeatureContribution> features = const [],
}) async {
  final opened = await tester.runAsync(
    () => AppDependencies.bootstrap(
      databasePath: inMemoryDatabasePath,
      databaseFactory: databaseFactoryFfi,
      preferencesStore: _PreferencesStore(),
      guestStore: _GuestStore(),
      features: features,
    ),
  );
  expect(opened, isA<Success<AppDependencies>>());
  final app = (opened! as Success<AppDependencies>).value;
  expect(
    await tester.runAsync(
      () => app.preferences.save(
        app.preferences.value.copyWith(
          language: AppLanguage.en,
          theme: AppTheme.dark,
          textScale: 1.5,
          reducedMotion: true,
        ),
      ),
    ),
    isA<Success<void>>(),
  );
  return app;
}

final class _PreferencesStore implements PreferencesStore {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String value) async => this.value = value;
}

final class _GuestStore implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('qa-report-guest');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}

final class _FailingExporter implements LocalReportExporter {
  @override
  Future<Result<bool>> saveText(String content) async => const Failed(
    AppFailure(
      code: FailureCode.storage,
      message: 'Deliberate storage failure.',
    ),
  );
}
