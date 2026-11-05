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

  test('manifest source and private checkpoint capabilities must match native support', () async {
    final manifest = jsonDecode(
      await rootBundle.loadString(ModuleAssetRepository.manifestPath),
    ) as Map<String, dynamic>;
    final capabilities = <String, Object>{
      'source_commit': List.filled(40, '0').join(),
      'module_version': '0.0.0',
      'adapter_version': 0,
      'learning_private_api_version': 2,
      'learning_checkpoint_schema': 2,
      'learning_checkpoint_max_bytes': 65536,
    };
    for (final capability in capabilities.entries) {
      for (final missing in [false, true]) {
        final changed = Map<String, dynamic>.of(manifest);
        if (missing) {
          changed.remove(capability.key);
        } else {
          changed[capability.key] = capability.value;
        }
        final result = await ModuleAssetRepository(
          bundle: _ManifestVariant(changed),
        ).verify();
        expect(
          result,
          isA<Failed<VerifiedModuleAssets>>(),
          reason: '${capability.key}: ${missing ? 'missing' : 'unsupported'}',
        );
      }
    }
    expect(
      await ModuleAssetRepository().verify(),
      isA<Success<VerifiedModuleAssets>>(),
    );
  });
}

final class _ManifestVariant extends CachingAssetBundle {
  _ManifestVariant(this.manifest);
  final Map<String, dynamic> manifest;

  @override
  Future<String> loadString(String key, {bool cache = true}) =>
      key == ModuleAssetRepository.manifestPath
      ? Future.value(jsonEncode(manifest))
      : rootBundle.loadString(key, cache: cache);

  @override
  Future<ByteData> load(String key) => rootBundle.load(key);
}

final class _FaultedRuntimeAsset extends CachingAssetBundle {
  _FaultedRuntimeAsset(this.path, {required this.missing});
  final String path;
  final bool missing;

  @override
  Future<ByteData> load(String key) async {
    if (key == path && missing) {
      throw StateError('Deliberately missing runtime asset.');
    }
    final original = await rootBundle.load(key);
    if (key != path) return original;
    final bytes = Uint8List.fromList(Uint8List.sublistView(original));
    bytes[bytes.length ~/ 2] ^= 1;
    return ByteData.sublistView(bytes);
  }
}
