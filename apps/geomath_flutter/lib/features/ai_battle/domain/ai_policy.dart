import '../../../core/geometry/geometry_card_provider.dart';

enum AiDifficulty { easy, medium, hard }

/// Explicit local simulation parameters, not measured human win rates.
final class AiDifficultyProfile {
  const AiDifficultyProfile._({
    required this.accuracyMin,
    required this.accuracyMax,
    required this.startMinAnswerMs,
    required this.startMaxAnswerMs,
    required this.endMinAnswerMs,
    required this.endMaxAnswerMs,
  });

  static const policyVersion = 1;
  final double accuracyMin, accuracyMax;
  final int startMinAnswerMs, startMaxAnswerMs;
  final int endMinAnswerMs, endMaxAnswerMs;

  static AiDifficultyProfile of(AiDifficulty difficulty) =>
      switch (difficulty) {
        AiDifficulty.easy => const AiDifficultyProfile._(
          accuracyMin: .40,
          accuracyMax: .65,
          startMinAnswerMs: 10000,
          startMaxAnswerMs: 16000,
          endMinAnswerMs: 7000,
          endMaxAnswerMs: 11000,
        ),
        AiDifficulty.medium => const AiDifficultyProfile._(
          accuracyMin: .60,
          accuracyMax: .82,
          startMinAnswerMs: 7000,
          startMaxAnswerMs: 11000,
          endMinAnswerMs: 4000,
          endMaxAnswerMs: 7000,
        ),
        AiDifficulty.hard => const AiDifficultyProfile._(
          accuracyMin: .78,
          accuracyMax: .96,
          startMinAnswerMs: 4500,
          startMaxAnswerMs: 7500,
          endMinAnswerMs: 1800,
          endMaxAnswerMs: 4000,
        ),
      };

  double pressureForCorrect(int correct) => correct.clamp(0, 8) / 8;

  double accuracyForCorrect(int correct) =>
      accuracyMin + (accuracyMax - accuracyMin) * pressureForCorrect(correct);

  ({int minimum, int maximum}) boundsForCorrect(int correct) {
    final pressure = pressureForCorrect(correct);
    return (
      minimum:
          (startMinAnswerMs + (endMinAnswerMs - startMinAnswerMs) * pressure)
              .round(),
      maximum:
          (startMaxAnswerMs + (endMaxAnswerMs - startMaxAnswerMs) * pressure)
              .round(),
    );
  }
}

/// One committed answer. Its five draws are sampled once per question.
/// [accuracy] is the probability of a complete correct R1/R2 pair.
final class AiOpponentPlan {
  const AiOpponentPlan._({
    required this.accuracy,
    required this.answerDelayMs,
    required this.solidDelayMs,
    required this.solid,
    required this.net,
    required this.correct,
  });

  factory AiOpponentPlan.fromDraws({
    required AiDifficulty difficulty,
    required int playerCorrect,
    required GeometryShape answer,
    required List<double> draws,
  }) {
    if (draws.length != 5 || draws.any((v) => !v.isFinite || v < 0 || v >= 1)) {
      throw const FormatException('Invalid AI random draws.');
    }
    final profile = AiDifficultyProfile.of(difficulty);
    final accuracy = profile.accuracyForCorrect(playerCorrect);
    final bounds = profile.boundsForCorrect(playerCorrect);
    final delay =
        bounds.minimum +
        (draws[1] * (bounds.maximum - bounds.minimum + 1)).floor();
    final correct = draws[0] < accuracy;
    final wrongSolid = !correct && draws[2] < .5;
    final alternatives = GeometryShape.values
        .where((v) => v != answer)
        .toList();
    final wrong = alternatives[(draws[3] * alternatives.length).floor()];
    return AiOpponentPlan._(
      accuracy: accuracy,
      answerDelayMs: delay,
      // A wrong R1 ends at the full sampled completion time too. It cannot
      // evade the selected difficulty's minimum answer-time cap.
      solidDelayMs: wrongSolid
          ? delay
          : (delay * (.35 + .30 * draws[4])).round().clamp(1, delay - 1),
      solid: wrongSolid ? wrong : answer,
      net: wrongSolid
          ? null
          : correct
          ? answer
          : wrong,
      correct: correct,
    );
  }

  final double accuracy;
  final int answerDelayMs, solidDelayMs;
  final GeometryShape solid;
  final GeometryShape? net;
  final bool correct;

  Map<String, Object?> toJson() => {
    'accuracy': accuracy,
    'answer_delay_ms': answerDelayMs,
    'solid_delay_ms': solidDelayMs,
    'solid': solid.name,
    'net': net?.name,
    'correct': correct,
  };
}
