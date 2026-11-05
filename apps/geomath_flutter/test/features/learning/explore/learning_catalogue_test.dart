import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/features/feature_localizations.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/features/learning/learning_catalogue.dart';
import 'package:geomath_flutter/features/learning/learning_strings.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<Map<String, dynamic>> source() async =>
      jsonDecode(await rootBundle.loadString(LearningCatalogue.assetPath))
          as Map<String, dynamic>;

  test(
    'bundled catalogue retains every canonical shape and surface identity',
    () async {
      final catalogue = await LearningCatalogue.load();
      expect(
        catalogue.sourceCommit,
        '37bc2cd262cc0a54e8ee31339ea37471c1ecfda5',
      );
      expect(catalogue.moduleVersion, '1.6.2');
      expect(catalogue.meshEntryPoint, 'learning-mesh.mjs/studySolidMesh');
      expect(catalogue.models.map((model) => model.id).toSet(), {
        'cube',
        'cuboid',
        'pyramid',
        'cylinder',
        'cone',
        'triangular-prism',
        'tetrahedron',
        'pentagonal-prism',
        'hexagonal-prism',
        'sphere',
        'hemisphere',
      });
      final original = await source();
      for (final model in catalogue.models) {
        expect(
          model.physicalSurfaceIds,
          orderedEquals(
            (original['models'] as List)
                    .cast<Map<String, dynamic>>()
                    .singleWhere(
                      (entry) => entry['id'] == model.id,
                    )['physical_surface_ids']
                as List,
          ),
        );
        expect(model.views, hasLength(6));
      }
      // These are source values, not a second native formula implementation.
      expect(catalogue.model('cube')!.dimensions, {'a': 4});
      expect(catalogue.model('cube')!.dimensions.containsKey('s'), isFalse);
      expect(catalogue.model('cylinder')!.physicalSurfaceIds, [0, 1, 2]);
      expect(catalogue.model('sphere')!.noNet, isTrue);
      expect(catalogue.model('hemisphere')!.noNet, isTrue);
      expect(catalogue.model('unknown'), isNull);
    },
  );

  test(
    'valid JSON with changed bytes fails the frozen manifest check',
    () async {
      await expectLater(
        LearningCatalogue.load(bundle: _CorruptCatalogueBundle()),
        throwsFormatException,
      );
    },
  );

  test('catalogue snapshots cannot be mutated by a native page', () async {
    final catalogue = await LearningCatalogue.load();
    expect(() => catalogue.models.clear(), throwsUnsupportedError);
    final model = catalogue.model('cone')!;
    expect(() => model.dimensions['j'] = 99, throwsUnsupportedError);
    expect(() => model.physicalSurfaceIds.clear(), throwsUnsupportedError);
    expect(() => model.labels.clear(), throwsUnsupportedError);
  });

  test(
    'duplicate models and malformed surfaces fail before module launch',
    () async {
      final duplicate = await source();
      (duplicate['models'] as List).add((duplicate['models'] as List).first);
      expect(
        () => LearningCatalogue.fromJson(duplicate),
        throwsFormatException,
      );

      final surfaces = await source();
      ((surfaces['models'] as List).first as Map)['physical_surface_ids'] = [
        0,
        0,
      ];
      expect(() => LearningCatalogue.fromJson(surfaces), throwsFormatException);

      final dimensions = await source();
      ((dimensions['models'] as List).first as Map)['dimensions'] = {'a': 0};
      expect(
        () => LearningCatalogue.fromJson(dimensions),
        throwsFormatException,
      );

      final future = await source();
      future['schema_version'] = 2;
      expect(() => LearningCatalogue.fromJson(future), throwsFormatException);

      final missing = await source();
      (missing['models'] as List).removeLast();
      expect(() => LearningCatalogue.fromJson(missing), throwsFormatException);

      final changedSource = await source();
      changedSource['source_commit'] =
          '0000000000000000000000000000000000000000';
      expect(
        () => LearningCatalogue.fromJson(changedSource),
        throwsFormatException,
      );

      final changedVersion = await source();
      changedVersion['module_version'] = '1.6.3';
      expect(
        () => LearningCatalogue.fromJson(changedVersion),
        throwsFormatException,
      );
    },
  );

  test(
    'both native languages cover all shapes and common page titles',
    () async {
      final registry = FeatureLocalizationRegistry([learningStrings]);
      expect(
        learningStrings.translations['ms']!.keys.toSet(),
        learningStrings.translations['en']!.keys.toSet(),
      );
      final catalogue = await LearningCatalogue.load();
      for (final language in AppLanguage.values) {
        final strings = AppStrings(
          language,
          contributions: registry.translations,
        );
        for (final model in catalogue.models) {
          final key = 'learning.shape.${model.id.replaceAll('-', '_')}';
          expect(strings.text(key), isNot(key));
          expect(model.localizedName(strings), strings.text(key));
        }
        for (final title in [
          'title',
          'exploreTitle',
          'viewsTitle',
          'notesTitle',
          'calculatorTitle',
          'labsTitle',
          'netTitle',
          'volumeTitle',
          'areaTitle',
          'compositeTitle',
          'projectionTitle',
          'calculationTitle',
          'recordsTitle',
        ]) {
          expect(strings.text('learning.$title'), isNot('learning.$title'));
        }
      }
    },
  );
}

final class _CorruptCatalogueBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) async {
    final data = await rootBundle.load(key);
    if (key != LearningCatalogue.assetPath) {
      return data;
    }
    final bytes = data.buffer.asUint8List(
      data.offsetInBytes,
      data.lengthInBytes,
    );
    // Trailing whitespace keeps the JSON valid while changing its pinned bytes.
    return ByteData.sublistView(Uint8List.fromList([...bytes, 32]));
  }
}
