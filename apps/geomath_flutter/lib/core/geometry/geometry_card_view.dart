import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../result.dart';
import 'geometry_card_provider.dart';

/// A neutral solid/net card for native games and the foundation guide.
/// It consumes only the shared provider, never a learning feature or WebView.
final class GeometryCardView extends StatefulWidget {
  const GeometryCardView({
    super.key,
    required this.shape,
    required this.kind,
    required this.provider,
    required this.semanticLabel,
    this.size = 120,
  });
  final GeometryShape shape;
  final GeometryCardKind kind;
  final GeometryCardProvider provider;
  final String semanticLabel;
  final double size;

  @override
  State<GeometryCardView> createState() => _GeometryCardViewState();
}

final class _GeometryCardViewState extends State<GeometryCardView> {
  late Future<Result<GeometryCard>> _card;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() => _card = widget.provider.card(widget.shape, widget.kind);

  @override
  void didUpdateWidget(GeometryCardView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.provider != widget.provider ||
        oldWidget.shape != widget.shape ||
        oldWidget.kind != widget.kind) {
      _load();
    }
  }

  @override
  Widget build(BuildContext context) => Semantics(
    image: true,
    label: widget.semanticLabel,
    child: SizedBox.square(
      dimension: widget.size,
      child: FutureBuilder<Result<GeometryCard>>(
        future: _card,
        builder: (context, snapshot) => switch (snapshot.data) {
          Success<GeometryCard>(:final value) => CustomPaint(
            painter: GeometryCardPainter(value),
          ),
          Failed<GeometryCard>() => const Center(
            child: Icon(Icons.broken_image_outlined),
          ),
          null => const Center(child: CircularProgressIndicator()),
        },
      ),
    ),
  );
}

/// Orthographic projection follows geometry.mjs/viewPoint, with depth-sorted,
/// double-sided panels as in the canonical renderer. Mesh math stays in JS.
final class GeometryCardPainter extends CustomPainter {
  const GeometryCardPainter(this.card);
  final GeometryCard card;

  GeometryPoint _view(GeometryPoint p) {
    final yaw = -card.yaw, pitch = card.pitch;
    final x = p.x * math.cos(yaw) + p.z * math.sin(yaw);
    final z = -p.x * math.sin(yaw) + p.z * math.cos(yaw);
    return GeometryPoint(
      x,
      p.y * math.cos(pitch) - z * math.sin(pitch),
      p.y * math.sin(pitch) + z * math.cos(pitch),
    );
  }

  @override
  void paint(Canvas canvas, Size size) {
    final faces = card.faces
        .map(
          (face) => (
            face: face,
            points: face.vertices.map(_view).toList(growable: false),
          ),
        )
        .toList(growable: false);
    final all = faces.expand((face) => face.points);
    if (all.isEmpty) return;
    final minX = all.map((p) => p.x).reduce(math.min);
    final maxX = all.map((p) => p.x).reduce(math.max);
    final minY = all.map((p) => p.y).reduce(math.min);
    final maxY = all.map((p) => p.y).reduce(math.max);
    final scale =
        math.min(
          size.width / math.max(maxX - minX, .001),
          size.height / math.max(maxY - minY, .001),
        ) *
        .84;
    Offset project(GeometryPoint p) => Offset(
      size.width / 2 + (p.x - (maxX + minX) / 2) * scale,
      size.height / 2 - (p.y - (maxY + minY) / 2) * scale,
    );
    double depth(List<GeometryPoint> points) =>
        points.map((p) => p.z).reduce((a, b) => a + b) / points.length;
    faces.sort((a, b) => depth(a.points).compareTo(depth(b.points)));
    final fill = Paint()..color = Color(card.neutralFillArgb);
    final edge = Paint()
      ..color = const Color(0xff27445d)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    for (final projected in faces) {
      final points = projected.points.map(project).toList(growable: false);
      final path = Path()..moveTo(points.first.dx, points.first.dy);
      for (final point in points.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      path.close();
      canvas.drawPath(path, fill);
      if (projected.face.outline) {
        canvas.drawPath(path, edge);
      } else {
        // Cover anti-alias seams between patches of one curved surface.
        canvas.drawPath(
          path,
          Paint()
            ..color = fill.color
            ..style = PaintingStyle.stroke
            ..strokeWidth = .6,
        );
      }
      for (final segment in [...projected.face.rim, ...projected.face.cut]) {
        if (segment.length == 2 &&
            segment.every((i) => i >= 0 && i < points.length)) {
          canvas.drawLine(points[segment[0]], points[segment[1]], edge);
        }
      }
    }
  }

  @override
  bool shouldRepaint(GeometryCardPainter oldDelegate) =>
      oldDelegate.card != card;
}
