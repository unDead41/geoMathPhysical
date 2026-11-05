import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';

import '../../core/l10n/app_strings.dart';

/// Native navigation metadata from the frozen canonical catalogue.
/// Geometry, formulae and worked calculations remain in the module.
final class LearningCatalogue {
  LearningCatalogue._({
    required this.sourceCommit,
    required this.moduleVersion,
    required this.meshEntryPoint,
    required List<LearningModel> models,
  }) : models = List.unmodifiable(models);

  static const assetPath = 'assets/contracts/learning_catalogue.json';
  static const sourceCommitPin = '37bc2cd262cc0a54e8ee31339ea37471c1ecfda5';
  static const canonicalIds = {
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
  };

  final String sourceCommit;
  final String moduleVersion;
  final String meshEntryPoint;
  final List<LearningModel> models;

  static Future<LearningCatalogue> load({AssetBundle? bundle}) async {
    final assets = bundle ?? rootBundle;
    final manifest = _object(
      jsonDecode(await assets.loadString('assets/contracts/manifest.json')),
      'manifest',
    );
    final files = manifest['files'];
    if (manifest['schema_version'] != 1 ||
        manifest['feature'] != 'contracts' ||
        manifest['source_commit'] != sourceCommitPin ||
        files is! List) {
      throw const FormatException('Invalid learning catalogue manifest');
    }
    final entries = files.where(
      (file) => file is Map && file['path'] == assetPath,
    );
    if (entries.length != 1) {
      throw const FormatException('Missing learning catalogue manifest entry');
    }
    final entry = _object(entries.single, 'manifest entry');
    final data = await assets.load(assetPath);
    final bytes = data.buffer.asUint8List(
      data.offsetInBytes,
      data.lengthInBytes,
    );
    if (entry['bytes'] != bytes.length ||
        sha256.convert(bytes).toString() != entry['sha256']) {
      throw const FormatException('Learning catalogue integrity check failed');
    }
    return LearningCatalogue.fromJson(jsonDecode(utf8.decode(bytes)));
  }

  factory LearningCatalogue.fromJson(Object? value) {
    final json = _object(value, 'catalogue');
    if (json['schema_version'] != 1) {
      throw const FormatException('Unsupported learning catalogue schema');
    }
    final source = _string(json, 'source_commit');
    if (source != sourceCommitPin ||
        json['module_version'] != '1.6.2' ||
        json['mesh_entry_point'] != 'learning-mesh.mjs/studySolidMesh') {
      throw const FormatException('Unsupported learning catalogue source');
    }
    final entries = json['models'];
    if (entries is! List || entries.isEmpty) {
      throw const FormatException('The learning catalogue is empty');
    }
    final models = [
      for (final entry in entries) LearningModel._fromJson(entry),
    ];
    final ids = models.map((model) => model.id).toSet();
    if (ids.length != models.length ||
        ids.length != canonicalIds.length ||
        !ids.containsAll(canonicalIds)) {
      throw const FormatException('Incomplete or duplicate learning models');
    }
    return LearningCatalogue._(
      sourceCommit: source,
      moduleVersion: _string(json, 'module_version'),
      meshEntryPoint: _string(json, 'mesh_entry_point'),
      models: models,
    );
  }

  LearningModel? model(String id) {
    for (final item in models) {
      if (item.id == id) {
        return item;
      }
    }
    return null;
  }
}

final class LearningModel {
  LearningModel._({
    required this.id,
    required this.name,
    required this.tag,
    required this.intro,
    required this.net,
    required this.observe,
    required this.flat,
    required this.curved,
    required this.edges,
    required this.vertices,
    required this.noNet,
    required this.enrichment,
    required List<String> labels,
    required List<String> views,
    required Map<String, num> dimensions,
    required List<int> physicalSurfaceIds,
  }) : labels = List.unmodifiable(labels),
       views = List.unmodifiable(views),
       dimensions = Map.unmodifiable(dimensions),
       physicalSurfaceIds = List.unmodifiable(physicalSurfaceIds);

  final String id;
  final String name;
  final String tag;
  final String intro;
  final String net;
  final String observe;
  final int flat;
  final int curved;
  final int edges;
  final int vertices;
  final bool noNet;
  final bool enrichment;
  final List<String> labels;
  final List<String> views;
  final Map<String, num> dimensions;
  final List<int> physicalSurfaceIds;

  int get surfaceCount => flat + curved;

  String localizedName(AppStrings strings) =>
      strings.text('learning.shape.${id.replaceAll('-', '_')}', fallback: name);

  factory LearningModel._fromJson(Object? value) {
    final json = _object(value, 'model');
    final id = _string(json, 'id');
    if (!RegExp(r'^[a-z]+(?:-[a-z]+)*$').hasMatch(id)) {
      throw const FormatException('Invalid learning model ID');
    }
    final flat = _count(json, 'flat');
    final curved = _count(json, 'curved');
    final labels = _strings(json, 'labels');
    final views = _strings(json, 'views');
    final rawIds = json['physical_surface_ids'];
    if (rawIds is! List ||
        rawIds.any((id) => id is! int || id < 0) ||
        rawIds.toSet().length != rawIds.length ||
        rawIds.length != flat + curved ||
        labels.length != rawIds.length ||
        views.length != 6) {
      throw FormatException('Invalid physical surfaces or views for $id');
    }
    final rawDimensions = _object(json['dimensions'], 'dimensions');
    if (rawDimensions.isEmpty ||
        rawDimensions.entries.any(
          (entry) =>
              entry.value is! num ||
              !(entry.value as num).isFinite ||
              (entry.value as num) <= 0,
        )) {
      throw FormatException('Invalid source dimensions for $id');
    }
    return LearningModel._(
      id: id,
      name: _string(json, 'name'),
      tag: _string(json, 'tag'),
      intro: _string(json, 'intro'),
      net: _string(json, 'net'),
      observe: _string(json, 'observe'),
      flat: flat,
      curved: curved,
      edges: _count(json, 'edges'),
      vertices: _count(json, 'vertices'),
      noNet: json['noNet'] == true,
      enrichment: json['enrichment'] == true,
      labels: labels,
      views: views,
      dimensions: rawDimensions.cast<String, num>(),
      physicalSurfaceIds: rawIds.cast<int>(),
    );
  }
}

Map<String, Object?> _object(Object? value, String name) {
  if (value is! Map<String, dynamic>) {
    throw FormatException('Invalid learning $name');
  }
  return value;
}

String _string(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String || value.trim().isEmpty) {
    throw FormatException('Missing learning catalogue $key');
  }
  return value;
}

int _count(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! int || value < 0) {
    throw FormatException('Invalid learning catalogue $key');
  }
  return value;
}

List<String> _strings(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! List ||
      value.any((item) => item is! String || item.trim().isEmpty)) {
    throw FormatException('Invalid learning catalogue $key');
  }
  return value.cast<String>();
}
