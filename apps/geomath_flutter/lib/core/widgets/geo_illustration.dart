import 'package:flutter/material.dart';

import '../design/face_palette.dart';
import '../design/design_tokens.g.dart';
import '../design/geomath_theme.dart';

/// Decorative identity illustration, never an answer card or renderer output.
final class GeoCubeIllustration extends StatelessWidget {
  const GeoCubeIllustration({
    this.size = 180,
    this.topLabel,
    this.frontLabel,
    this.rightLabel,
    this.semanticLabel,
    super.key,
  });

  final double size;
  final String? topLabel;
  final String? frontLabel;
  final String? rightLabel;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) => Semantics(
    label: semanticLabel,
    image: semanticLabel != null,
    excludeSemantics: true,
    child: RepaintBoundary(
      child: CustomPaint(
        size: Size.square(size),
        painter: _CubePainter(
          outline: GeoMathColors.of(context).ink,
          topLabel: topLabel,
          frontLabel: frontLabel,
          rightLabel: rightLabel,
          textScaler: MediaQuery.textScalerOf(context),
        ),
      ),
    ),
  );
}

final class GeoBrandMark extends StatelessWidget {
  const GeoBrandMark({this.size = 40, this.semanticLabel, super.key});

  final double size;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) =>
      GeoCubeIllustration(size: size, semanticLabel: semanticLabel);
}

final class _CubePainter extends CustomPainter {
  _CubePainter({
    required this.outline,
    required this.textScaler,
    this.topLabel,
    this.frontLabel,
    this.rightLabel,
  });

  final Color outline;
  final TextScaler textScaler;
  final String? topLabel;
  final String? frontLabel;
  final String? rightLabel;

  @override
  void paint(Canvas canvas, Size size) {
    Offset point(double x, double y) => Offset(x * size.width, y * size.height);
    final a = point(.5, .04);
    final b = point(.92, .26);
    final c = point(.5, .49);
    final d = point(.08, .26);
    final e = point(.08, .72);
    final f = point(.5, .95);
    final g = point(.92, .72);
    canvas.drawOval(
      Rect.fromCenter(
        center: point(.5, .95),
        width: size.width * .86,
        height: size.height * .09,
      ),
      Paint()..color = outline.withValues(alpha: .08),
    );
    void face(List<Offset> points, int faceId) {
      final path = Path()..moveTo(points.first.dx, points.first.dy);
      for (final vertex in points.skip(1)) {
        path.lineTo(vertex.dx, vertex.dy);
      }
      path.close();
      canvas.drawPath(
        path,
        Paint()..color = FacePalette.cubeAndCuboid[faceId]!,
      );
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.3
          ..strokeJoin = StrokeJoin.round
          ..color = outline.withValues(alpha: .35),
      );
    }

    face([d, c, f, e], 0);
    face([c, b, g, f], 1);
    face([a, b, c, d], 4);

    void label(String? text, Offset center, double rotation, Color color) {
      if (text == null) return;
      final painter = TextPainter(
        text: TextSpan(
          text: text,
          style: TextStyle(
            color: color,
            fontSize: size.width * .075,
            fontWeight: FontWeight.w700,
          ),
        ),
        textDirection: TextDirection.ltr,
        textScaler: textScaler,
        maxLines: 1,
      )..layout(maxWidth: size.width * .45);
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(rotation);
      painter.paint(canvas, Offset(-painter.width / 2, -painter.height / 2));
      canvas.restore();
    }

    // Fixed labels name the original faces; they are not camera-side guesses.
    final labelInk = GeoMathColors.fromTokens(DesignTokens.strong).ink;
    label(topLabel, point(.5, .265), 0, labelInk);
    label(frontLabel, point(.29, .59), .45, labelInk);
    label(rightLabel, point(.71, .59), -.45, labelInk);
  }

  @override
  bool shouldRepaint(_CubePainter oldDelegate) =>
      outline != oldDelegate.outline ||
      textScaler != oldDelegate.textScaler ||
      topLabel != oldDelegate.topLabel ||
      frontLabel != oldDelegate.frontLabel ||
      rightLabel != oldDelegate.rightLabel;
}
