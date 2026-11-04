import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/core/result.dart';

final class _CardAssets extends CachingAssetBundle {
  _CardAssets({this.corrupt = false});
  final bool corrupt;
  @override
  Future<ByteData> load(String key) async {
    final bytes = await File(key).readAsBytes();
    if (corrupt && key.endsWith('geometry_cards.json')) bytes[100] ^= 1;
    return ByteData.sublistView(bytes);
  }
}

void main() {
  test(
    'all five game shapes have canonical neutral solid and net cards',
    () async {
      final provider = BundleGeometryCardProvider(bundle: _CardAssets());
      expect(GeometryShape.values.map((s) => s.name), [
        'cube',
        'cuboid',
        'pyramid',
        'cylinder',
        'cone',
      ]);
      const surfaces = {
        GeometryShape.cube: 6,
        GeometryShape.cuboid: 6,
        GeometryShape.pyramid: 5,
        GeometryShape.cylinder: 3,
        GeometryShape.cone: 2,
      };
      for (final shape in GeometryShape.values) {
        for (final kind in GeometryCardKind.values) {
          final result = await provider.card(shape, kind);
          expect(result, isA<Success<GeometryCard>>());
          final card = result.valueOrNull!;
          expect(card.neutralFillArgb, 0xffd5dfea);
          expect(card.faces.map((f) => f.id).toSet().length, surfaces[shape]);
          expect(card.faces.every((f) => f.vertices.length >= 3), isTrue);
          expect(
            card.faces
                .expand((f) => f.vertices)
                .every((p) => p.x.isFinite && p.y.isFinite && p.z.isFinite),
            isTrue,
          );
        }
      }
    },
  );
  test(
    'damaged card source does not produce a successful geometry DTO',
    () async {
      final result = await BundleGeometryCardProvider(
        bundle: _CardAssets(corrupt: true),
      ).card(GeometryShape.cone, GeometryCardKind.net);
      expect(result, isA<Failed<GeometryCard>>());
    },
  );
}
