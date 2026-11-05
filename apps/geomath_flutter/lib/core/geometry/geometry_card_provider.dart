import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';

import '../result.dart';

/// Game IDs are independent of the eleven-model learning feature catalogue.
enum GeometryShape { cube, cuboid, pyramid, cylinder, cone }

enum GeometryCardKind { solid, net }

final class GeometryPoint {
  const GeometryPoint(this.x, this.y, this.z);
  final double x;
  final double y;
  final double z;
}

final class GeometryFace {
  const GeometryFace({
    required this.id,
    required this.name,
    required this.vertices,
    required this.outline,
    this.rim = const [],
    this.cut = const [],
  });
  final int id;
  final String name;
  final List<GeometryPoint> vertices;
  final bool outline;
  final List<List<int>> rim;
  final List<List<int>> cut;
}

/// Exact mesh coordinates and stable physical surface IDs from canonical JS.
/// All options use one neutral fill; face colors cannot disclose a correct pair.
final class GeometryCard {
  const GeometryCard({
    required this.shape,
    required this.kind,
    required this.faces,
    required this.yaw,
    required this.pitch,
  });
  final GeometryShape shape;
  final GeometryCardKind kind;
  final List<GeometryFace> faces;
  final double yaw;
  final double pitch;
  int get neutralFillArgb => 0xffd5dfea;
}

abstract interface class GeometryCardProvider {
  Future<Result<GeometryCard>> card(GeometryShape shape, GeometryCardKind kind);
}

/// This provider has no dependency on features/learning, its WebView, or a
/// network connection. Prompt 3 can consume the same cards immediately.
final class BundleGeometryCardProvider implements GeometryCardProvider {
  BundleGeometryCardProvider({AssetBundle? bundle})
    : _bundle = bundle ?? rootBundle;

  final AssetBundle _bundle;
  Map<String, dynamic>? _catalogue;

  @override
  Future<Result<GeometryCard>> card(
    GeometryShape shape,
    GeometryCardKind kind,
  ) async {
    try {
      final catalogue = _catalogue ??= await _load();
      final cards = catalogue['cards'] as List<dynamic>;
      final item = cards.cast<Map<String, dynamic>>().singleWhere(
        (item) => item['shape'] == shape.name,
      );
      final rawFaces = item[kind.name] as List<dynamic>;
      final camera =
          item[kind == GeometryCardKind.net ? 'net_camera' : 'camera']
              as Map<String, dynamic>;
      final faces = rawFaces
          .cast<Map<String, dynamic>>()
          .map((face) {
            final points = (face['vertices'] as List<dynamic>)
                .map((raw) {
                  final values = (raw as List<dynamic>).cast<num>();
                  if (values.length != 3 || values.any((v) => !v.isFinite)) {
                    throw const FormatException('Invalid canonical vertex.');
                  }
                  return GeometryPoint(
                    values[0].toDouble(),
                    values[1].toDouble(),
                    values[2].toDouble(),
                  );
                })
                .toList(growable: false);
            if (points.length < 3 || face['color'] != '#D5DFEA') {
              throw const FormatException('Invalid neutral surface.');
            }
            return GeometryFace(
              id: face['id'] as int,
              name: face['name'] as String,
              vertices: List.unmodifiable(points),
              outline: face['outline'] as bool,
              rim: _edges(face['rim']),
              cut: _edges(face['cut']),
            );
          })
          .toList(growable: false);
      return Success(
        GeometryCard(
          shape: shape,
          kind: kind,
          faces: List.unmodifiable(faces),
          yaw: (camera['yaw'] as num).toDouble(),
          pitch: (camera['pitch'] as num).toDouble(),
        ),
      );
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'Canonical geometry cards are missing or damaged.',
        ),
      );
    }
  }

  Future<Map<String, dynamic>> _load() async {
    final manifest = jsonDecode(
      await _bundle.loadString('assets/contracts/manifest.json', cache: false),
    ) as Map<String, dynamic>;
    if (manifest['schema_version'] != 1 || manifest['feature'] != 'contracts') {
      throw const FormatException('Invalid contract asset manifest.');
    }
    final entry = (manifest['files'] as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .singleWhere(
          (entry) => entry['path'] == 'assets/contracts/geometry_cards.json',
        );
    final data = await _bundle.load(entry['path'] as String);
    final bytes = Uint8List.sublistView(data);
    if (bytes.length != entry['bytes'] ||
        sha256.convert(bytes).toString() != entry['sha256']) {
      throw const FormatException('Canonical geometry hash mismatch.');
    }
    final catalogue = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
    if (catalogue['schema_version'] != 1 || catalogue['neutral'] != true) {
      throw const FormatException('Invalid neutral geometry schema.');
    }
    final ids = (catalogue['game_shapes'] as List<dynamic>).cast<String>();
    if (ids.length != GeometryShape.values.length ||
        !GeometryShape.values.every((shape) => ids.contains(shape.name))) {
      throw const FormatException('Canonical game shapes changed.');
    }
    return catalogue;
  }

  static List<List<int>> _edges(Object? raw) {
    if (raw == null) return const [];
    return List.unmodifiable(
      (raw as List<dynamic>).map(
        (edge) => List<int>.unmodifiable((edge as List<dynamic>).cast<int>()),
      ),
    );
  }
}
