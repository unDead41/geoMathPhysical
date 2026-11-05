import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/features/learning/module_asset_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'installed feature bundle verifies the frozen canonical source offline',
    () async {
      // This is a bundled-byte test. Android cold launch is a separate gate.
      final repository = ModuleAssetRepository();
      final checked = await repository.verify();
      expect(checked, isA<Success<VerifiedModuleAssets>>());
      final assets = (checked as Success<VerifiedModuleAssets>).value;
      expect(assets.sourceCommit, '37bc2cd262cc0a54e8ee31339ea37471c1ecfda5');
      expect(assets.moduleVersion, '1.6.2');
      expect(assets.entryPoint, ModuleAssetRepository.entryPoint);
      expect(assets.fileCount, greaterThanOrEqualTo(3));
      // Reopening does not depend on an earlier website cache or verification flag.
      expect(
        await ModuleAssetRepository().verify(),
        isA<Success<VerifiedModuleAssets>>(),
      );
    },
  );

  test('a corrupt or missing byte source in any listed runtime file fails closed', () async {
    final manifest = jsonDecode(
      await rootBundle.loadString(ModuleAssetRepository.manifestPath),
    ) as Map<String, dynamic>;
    final files = manifest['files'] as List;
    expect(files, isNotEmpty);
    for (final file in files.cast<Map<String, dynamic>>()) {
      final path = file['path'] as String;
      for (final missing in [false, true]) {
        final result = await ModuleAssetRepository(
          bundle: _FaultedRuntimeAsset(path, missing: missing),
        ).verify();
        expect(
          result,
          isA<Failed<VerifiedModuleAssets>>(),
          reason:
              '${missing ? 'Missing' : 'Corrupt'} runtime file accepted: $path',
        );
        expect(result.failureOrNull?.code, FailureCode.unavailable);
        expect(result.valueOrNull, isNull);
      }
    }
    expect(
      await ModuleAssetRepository().verify(),
      isA<Success<VerifiedModuleAssets>>(),
    );
  });
}

final class _FaultedRuntimeAsset extends CachingAssetBundle {
  _FaultedRuntimeAsset(this.path, {required this.missing});
  final String path;
  final bool missing;

  @override
  Future<ByteData> load(String key) async {
    final original = await rootBundle.load(key);
    if (key != path) return original;
    if (missing) throw StateError('Deliberately missing runtime asset.');
    final bytes = Uint8List.fromList(Uint8List.sublistView(original));
    bytes[bytes.length ~/ 2] ^= 1;
    return ByteData.sublistView(bytes);
  }
}
