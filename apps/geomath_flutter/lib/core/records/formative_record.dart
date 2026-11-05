import '../result.dart';

enum ModuleActivity { net, volume, area, composite }

enum ReflectionStage { prediction, experiment, check, explanation }

/// Canonical progress protocol 1 record, without message/session envelope fields.
final class ModuleReflection {
  const ModuleReflection._({
    required this.activity,
    required this.stage,
    required this.prediction,
    required this.result,
    required this.explanation,
    required this.completed,
  });

  final ModuleActivity activity;
  final ReflectionStage stage;
  final String prediction;
  final String result;
  final String explanation;
  final bool completed;

  static Result<ModuleReflection> create({
    required ModuleActivity activity,
    required ReflectionStage stage,
    required String prediction,
    String result = '',
    String explanation = '',
    bool completed = false,
  }) => fromJson({
    'activity': activity.name,
    'stage': stage.name,
    'prediction': prediction,
    'result': result,
    'explanation': explanation,
    'completed': completed,
  });

  /// Length checks precede trimming, exactly as normalizeModuleRecord in source.
  /// String.length counts UTF-16 code units, as JavaScript does.
  static Result<ModuleReflection> fromJson(Map<String, Object?> value) {
    final activity = _enumValue(ModuleActivity.values, value['activity']);
    final stage = _enumValue(ReflectionStage.values, value['stage']);
    final completed = value['completed'];
    if (activity == null || stage == null || completed is! bool) {
      return _invalid();
    }
    final prediction = _moduleText(value['prediction'], 240);
    final result = _moduleText(value['result'], 600);
    final explanation = _moduleText(value['explanation'], 600);
    if (prediction == null ||
        result == null ||
        explanation == null ||
        prediction.isEmpty ||
        (stage.index >= 1 && result.isEmpty) ||
        (stage == ReflectionStage.explanation && explanation.isEmpty) ||
        (completed && stage != ReflectionStage.explanation)) {
      return _invalid();
    }
    return Success(
      ModuleReflection._(
        activity: activity,
        stage: stage,
        prediction: prediction,
        result: result,
        explanation: explanation,
        completed: completed,
      ),
    );
  }

  static String? _moduleText(Object? value, int maximum) {
    final text = value ?? '';
    if (text is! String ||
        text.length > maximum ||
        RegExp(r'[\u0000-\u0008\u000B\u000C\u000E-\u001F]').hasMatch(text)) {
      return null;
    }
    return text.trim();
  }

  static Failed<ModuleReflection> _invalid() => const Failed(
    AppFailure(
      code: FailureCode.invalid,
      message: 'Reflection content or stage is invalid.',
    ),
  );

  /// Preserves completed progress and never regresses a stage during merging.
  /// A newer completed explanation may replace an earlier completed explanation.
  ModuleReflection merge(ModuleReflection next) {
    if (activity != next.activity) {
      throw ArgumentError('Activity does not match.');
    }
    if ((!completed && (next.completed || next.stage.index >= stage.index)) ||
        (completed && next.completed)) {
      return next;
    }
    return this;
  }

  Map<String, Object?> toJson() => {
    'activity': activity.name,
    'stage': stage.name,
    'prediction': prediction,
    'result': result,
    'explanation': explanation,
    'completed': completed,
  };

  @override
  bool operator ==(Object other) =>
      other is ModuleReflection &&
      activity == other.activity &&
      stage == other.stage &&
      prediction == other.prediction &&
      result == other.result &&
      explanation == other.explanation &&
      completed == other.completed;

  @override
  int get hashCode =>
      Object.hash(activity, stage, prediction, result, explanation, completed);
}

enum SoloMode { quiz, practice, review }

/// Self-reported completed solo study; never verified classroom/Duel marks.
final class CompletedSoloRecord {
  const CompletedSoloRecord._({
    required this.attemptId,
    required this.mode,
    required this.ruleset,
    required this.score,
    required this.total,
    required this.mistakes,
    required this.hints,
    required this.skipped,
    required this.elapsedMilliseconds,
  });

  static const canonicalRuleset = 'single-attempt-v1';
  final String attemptId;
  final SoloMode mode;
  final String ruleset;
  final int score;
  final int total;
  final int mistakes;
  final int hints;
  final int skipped;
  final int elapsedMilliseconds;

  static Result<CompletedSoloRecord> fromJson(Map<String, Object?> value) {
    final attemptId = value['attempt_id'];
    final mode = _enumValue(SoloMode.values, value['mode']);
    final total = _integer(value['total'], 1, 15);
    final elapsed = _integer(value['elapsed_ms'], 0, 604800000);
    if (attemptId is! String ||
        !isFormativeEventId(attemptId) ||
        mode == null ||
        value['ruleset'] != canonicalRuleset ||
        total == null ||
        elapsed == null ||
        (mode == SoloMode.quiz && total != 10) ||
        (mode == SoloMode.practice && total != 15)) {
      return _invalid();
    }
    final score = _integer(value['score'], 0, total);
    final mistakes = _integer(value['mistakes'], 0, total);
    final hints = _integer(value['hints'], 0, total);
    final skipped = _integer(value['skipped'], 0, total);
    if (score == null ||
        mistakes == null ||
        hints == null ||
        skipped == null ||
        score + mistakes + skipped != total) {
      return _invalid();
    }
    return Success(
      CompletedSoloRecord._(
        attemptId: attemptId,
        mode: mode,
        ruleset: canonicalRuleset,
        score: score,
        total: total,
        mistakes: mistakes,
        hints: hints,
        skipped: skipped,
        elapsedMilliseconds: elapsed,
      ),
    );
  }

  static Failed<CompletedSoloRecord> _invalid() => const Failed(
    AppFailure(
      code: FailureCode.invalid,
      message: 'Completed solo result is invalid.',
    ),
  );

  Map<String, Object?> toJson() => {
    'attempt_id': attemptId,
    'mode': mode.name,
    'ruleset': ruleset,
    'score': score,
    'total': total,
    'mistakes': mistakes,
    'hints': hints,
    'skipped': skipped,
    'elapsed_ms': elapsedMilliseconds,
  };

  @override
  bool operator ==(Object other) =>
      other is CompletedSoloRecord &&
      attemptId == other.attemptId &&
      mode == other.mode &&
      ruleset == other.ruleset &&
      score == other.score &&
      total == other.total &&
      mistakes == other.mistakes &&
      hints == other.hints &&
      skipped == other.skipped &&
      elapsedMilliseconds == other.elapsedMilliseconds;

  @override
  int get hashCode => Object.hash(
    attemptId,
    mode,
    ruleset,
    score,
    total,
    mistakes,
    hints,
    skipped,
    elapsedMilliseconds,
  );
}

bool isFormativeEventId(String value) =>
    RegExp(r'^[A-Za-z0-9:_.-]{1,160}$').hasMatch(value);

T? _enumValue<T extends Enum>(List<T> values, Object? value) {
  for (final option in values) {
    if (option.name == value) return option;
  }
  return null;
}

int? _integer(Object? value, int minimum, int maximum) {
  if (value is! num ||
      !value.isFinite ||
      value < minimum ||
      value > maximum ||
      value != value.truncateToDouble()) {
    return null;
  }
  return value.toInt();
}
