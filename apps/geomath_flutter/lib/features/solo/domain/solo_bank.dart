import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';

import '../../../core/geometry/geometry_card_provider.dart';

final class SoloQuestion {
  const SoloQuestion({
    required this.id,
    required this.shape,
    required this.lines,
    required this.prompt,
    required this.hint,
  });
  factory SoloQuestion.fromJson(Map<String, dynamic> json) => SoloQuestion(
    id: json['id'] as String,
    shape: GeometryShape.values.byName(json['shape'] as String),
    lines: List<String>.unmodifiable((json['lines'] as List).cast<String>()),
    prompt: json['prompt'] as String,
    hint: json['hint'] as String,
  );
  final String id;
  final GeometryShape shape;
  final List<String> lines;
  final String prompt;
  final String hint;
  String get topic => RegExp(r'^[VL]=').hasMatch(prompt)
      ? 'formula'
      : id.endsWith('3')
      ? 'net'
      : 'properties';
  Map<String, Object?> toJson() => {
    'id': id,
    'shape': shape.name,
    'lines': lines,
    'prompt': prompt,
    'hint': hint,
  };
}

/// The approved foundation export, including exact source-bank byte identity.
final class SoloBank {
  SoloBank._(this.questions, this.identity);
  static const approvedIdentity =
      'bank15-sha256:6ea4e9057d1f04e4f485aeefd89ec3cb681deb07b2dad7e76862e78e22159065';
  final List<SoloQuestion> questions;
  final String identity;
  SoloQuestion question(String id) => questions.singleWhere((q) => q.id == id);
  factory SoloBank.fromExport(Map<String, dynamic> export) {
    if (export['schema_version'] != 1 ||
        export['bank_version'] != approvedIdentity) {
      throw const FormatException('Unsupported solo bank.');
    }
    final raw = (export['questions'] as List).cast<Map<String, dynamic>>();
    final digest = sha256.convert(utf8.encode(jsonEncode(raw))).toString();
    if ('bank15-sha256:$digest' != approvedIdentity) {
      throw const FormatException('Solo bank identity mismatch.');
    }
    final questions = raw.map(SoloQuestion.fromJson).toList(growable: false);
    if (questions.length != 15 ||
        questions.map((q) => q.id).toSet().length != 15 ||
        GeometryShape.values.any(
          (shape) => questions.where((q) => q.shape == shape).length != 3,
        )) {
      throw const FormatException('Invalid solo bank.');
    }
    return SoloBank._(List.unmodifiable(questions), approvedIdentity);
  }
  static Future<SoloBank> load({AssetBundle? bundle}) async {
    final assets = bundle ?? rootBundle;
    final manifest = jsonDecode(
      await assets.loadString('assets/contracts/manifest.json'),
    ) as Map<String, dynamic>;
    final entry = (manifest['files'] as List)
        .cast<Map<String, dynamic>>()
        .singleWhere((row) => row['path'] == 'assets/contracts/bank15.json');
    final data = await assets.load('assets/contracts/bank15.json');
    final bytes = Uint8List.sublistView(data);
    if (bytes.length != entry['bytes'] ||
        sha256.convert(bytes).toString() != entry['sha256']) {
      throw const FormatException('Solo bank asset is damaged.');
    }
    return SoloBank.fromExport(
      jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>,
    );
  }
}
