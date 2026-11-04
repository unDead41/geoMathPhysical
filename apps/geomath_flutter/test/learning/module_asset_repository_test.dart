import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/features/learning/module_asset_repository.dart';

final class _FileAssets extends CachingAssetBundle {
  _FileAssets({this.missing, this.corrupt});
  final String? missing;
  final String? corrupt;
  @override
  Future<ByteData> load(String key) async {
    if (key == missing) throw StateError('Missing asset');
    final bytes = await File(key).readAsBytes();
    if (key == corrupt) bytes[bytes.length ~/ 2] ^= 1;
    return ByteData.sublistView(bytes);
  }
}

void main() {
  test('complete offline source-built assets are verified before ready is possible', () async {
    final result = await ModuleAssetRepository(bundle: _FileAssets()).verify();
    expect(result, isA<Success<VerifiedModuleAssets>>());
    expect(result.valueOrNull!.fileCount, 3);
    expect(result.valueOrNull!.entryPoint, 'assets/module/index.html');
    expect(result.valueOrNull!.moduleVersion, '1.6.2');
  });

  for (final name in [
    'manifest.json',
    'index.html',
    'native-adapter.js',
    'canonical-module.html',
  ]) {
    test('missing $name fails closed', () async {
      final result = await ModuleAssetRepository(
        bundle: _FileAssets(missing: 'assets/module/$name'),
      ).verify();
      expect(result, isA<Failed<VerifiedModuleAssets>>());
      expect(result.failureOrNull!.code, FailureCode.unavailable);
    });
    test('corrupt $name fails integrity verification', () async {
      final result = await ModuleAssetRepository(
        bundle: _FileAssets(corrupt: 'assets/module/$name'),
      ).verify();
      expect(result, isA<Failed<VerifiedModuleAssets>>());
    });
  }
}
