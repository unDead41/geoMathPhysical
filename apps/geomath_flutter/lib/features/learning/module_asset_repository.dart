import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';

import '../../core/result.dart';
import 'persistence/learning_checkpoint_schema.dart';

final class VerifiedModuleAssets {
  const VerifiedModuleAssets({
    required this.entryPoint,
    required this.sourceCommit,
    required this.moduleVersion,
    required this.fileCount,
  });
  final String entryPoint;
  final String sourceCommit;
  final String moduleVersion;
  final int fileCount;
}

/// A missing, malformed or corrupt asset can never produce a ready receipt.
/// The central app catalog registers only this feature manifest's path.
final class ModuleAssetRepository {
  ModuleAssetRepository({AssetBundle? bundle}) : _bundle = bundle ?? rootBundle;

  static const manifestPath = 'assets/module/manifest.json';
  static const entryPoint = 'assets/module/index.html';
  static const _manifestKeys = {
    'schema_version',
    'feature',
    'source_commit',
    'digital_version',
    'module_version',
    'entry_point',
    'canonical_build',
    'canonical_html_sha256',
    'offline',
    'module_progress_protocol',
    'module_settings_version',
    'native_bridge_version',
    'adapter_version',
    'learning_private_api_version',
    'learning_checkpoint_schema',
    'learning_checkpoint_max_bytes',
    'files',
  };
  final AssetBundle _bundle;

  Future<Result<VerifiedModuleAssets>> verify() async {
    try {
      final raw = await _bundle.loadString(manifestPath, cache: false);
      if (raw.length > 64000) {
        throw const FormatException('Manifest too large.');
      }
      final manifest = jsonDecode(raw);
      if (manifest is! Map<String, dynamic> ||
          manifest.length != _manifestKeys.length ||
          !_manifestKeys.every(manifest.containsKey) ||
          manifest['schema_version'] != 1 ||
          manifest['feature'] != 'learning' ||
          manifest['entry_point'] != entryPoint ||
          manifest['offline'] != true ||
          manifest['native_bridge_version'] != 1 ||
          manifest['module_progress_protocol'] != 1 ||
          manifest['module_settings_version'] != 1 ||
          manifest['adapter_version'] != 3 ||
          manifest['learning_private_api_version'] != 1 ||
          manifest['learning_checkpoint_schema'] !=
              LearningCheckpointSchema.version ||
          manifest['learning_checkpoint_max_bytes'] !=
              LearningCheckpointSchema.maximumBytes ||
          manifest['source_commit'] is! String ||
          !RegExp(r'^[a-f0-9]{40}$')
              .hasMatch(manifest['source_commit'] as String) ||
          manifest['source_commit'] != LearningCheckpointSchema.sourceCommit ||
          manifest['digital_version'] != '2.9.1' ||
          manifest['canonical_build'] != 'digital/module/tools/build.mjs' ||
          manifest['canonical_html_sha256'] is! String ||
          !RegExp(r'^[a-f0-9]{64}$')
              .hasMatch(manifest['canonical_html_sha256'] as String) ||
          manifest['module_version'] !=
              LearningCheckpointSchema.moduleVersion) {
        throw const FormatException('Unsupported module manifest.');
      }
      final files = manifest['files'];
      if (files is! List || files.isEmpty || files.length > 256) {
        throw const FormatException('Invalid module file list.');
      }
      final seen = <String>{};
      for (final file in files) {
        if (file is! Map<String, dynamic> ||
            file.length != 3 ||
            !const {'path', 'sha256', 'bytes'}.every(file.containsKey)) {
          throw const FormatException('Invalid module file.');
        }
        final assetPath = file['path'];
        final hash = file['sha256'];
        final length = file['bytes'];
        if (assetPath == 'assets/module/canonical-module.html' &&
            hash != manifest['canonical_html_sha256']) {
          throw const FormatException('Canonical source digest mismatch.');
        }
        if (assetPath is! String ||
            !RegExp(r'^assets/module/[a-zA-Z0-9_./-]+$').hasMatch(assetPath) ||
            assetPath.contains('..') ||
            !seen.add(assetPath) ||
            hash is! String ||
            !RegExp(r'^[a-f0-9]{64}$').hasMatch(hash) ||
            length is! int ||
            length < 1 ||
            length > 16000000) {
          throw const FormatException('Invalid module integrity entry.');
        }
        final bytes = Uint8List.sublistView(await _bundle.load(assetPath));
        if (bytes.length != length ||
            sha256.convert(bytes).toString() != hash) {
          throw const FormatException('Module integrity verification failed.');
        }
      }
      if (!seen.contains(entryPoint) ||
          !seen.contains('assets/module/native-adapter.js') ||
          !seen.contains('assets/module/canonical-module.html')) {
        throw const FormatException('Incomplete canonical module bundle.');
      }
      return Success(
        VerifiedModuleAssets(
          entryPoint: entryPoint,
          sourceCommit: manifest['source_commit'] as String,
          moduleVersion: manifest['module_version'] as String,
          fileCount: files.length,
        ),
      );
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'The offline learning module is missing or damaged. Reinstall a verified app bundle.',
        ),
      );
    }
  }
}
