import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';

import '../../../core/geometry/geometry_card_provider.dart';
import '../../../core/preferences/preferences.dart';
import '../../../core/result.dart';
import 'classroom_question_copy.g.dart';

final class ClassroomQuestion {
  const ClassroomQuestion({
    required this.id,
    required this.shape,
    required this.prompt,
    required this.hint,
  });
  final String id, prompt, hint;
  final GeometryShape shape;
  String localizedPrompt(AppLanguage language) => language == AppLanguage.en
      ? (classroomQuestionEnglish[id] ?? const {})['prompt'] ?? prompt
      : (classroomQuestionMalay[id] ?? const {})['prompt'] ?? prompt;
  String localizedHint(AppLanguage language) => language == AppLanguage.en
      ? (classroomQuestionEnglish[id] ?? const {})['hint'] ?? hint
      : (classroomQuestionMalay[id] ?? const {})['hint'] ?? hint;
}

/// Verified foundation bank supplies presentation only. Server state chooses IDs.
final class ClassroomBank {
  ClassroomBank({AssetBundle? bundle}) : _bundle = bundle ?? rootBundle;
  final AssetBundle _bundle;
  Future<Result<Map<String, ClassroomQuestion>>>? _pending;

  Future<Result<Map<String, ClassroomQuestion>>> load() => _pending ??= _load();
  Future<Result<Map<String, ClassroomQuestion>>> _load() async {
    try {
      const path = 'assets/contracts/bank15.json';
      final manifest = jsonDecode(
        await _bundle.loadString('assets/contracts/manifest.json'),
      ) as Map;
      final entry = (manifest['files'] as List).cast<Map>().singleWhere(
        (e) => e['path'] == path,
      );
      final bytes = Uint8List.sublistView(await _bundle.load(path));
      if (entry['bytes'] != bytes.length ||
          entry['sha256'] != sha256.convert(bytes).toString()) {
        throw const FormatException();
      }
      final json = jsonDecode(utf8.decode(bytes)) as Map;
      if (json['schema_version'] != 1) throw const FormatException();
      final result = <String, ClassroomQuestion>{};
      for (final value in (json['questions'] as List).cast<Map>()) {
        final shape = GeometryShape.values.singleWhere(
          (s) => s.name == value['shape'],
        );
        final id = value['id'] as String;
        if (result.containsKey(id) ||
            !classroomQuestionEnglish.containsKey(id)) {
          throw const FormatException();
        }
        result[id] = ClassroomQuestion(
          id: id,
          shape: shape,
          prompt: value['prompt'] as String,
          hint: value['hint'] as String,
        );
      }
      if (result.length != 15 ||
          GeometryShape.values.any(
            (shape) => result.values.where((q) => q.shape == shape).length != 3,
          )) {
        throw const FormatException();
      }
      return Success(Map.unmodifiable(result));
    } catch (_) {
      _pending = null;
      return const Failed(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'classroom.error.bank',
        ),
      );
    }
  }
}
