import 'dart:async';
import 'dart:convert';

import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/duel/duel_feature.dart';

const testNow = 1700000000000;
const roomId = '11111111-1111-4111-8111-111111111111';
const meId = '22222222-2222-4222-8222-222222222222';
const friendId = '33333333-3333-4333-8333-333333333333';

final class DuelTestClock implements Clock {
  int wall = testNow, monotonic = 0;
  void elapse(int milliseconds) {
    wall += milliseconds;
    monotonic += milliseconds;
  }

  @override
  DateTime now() => DateTime.fromMillisecondsSinceEpoch(wall, isUtc: true);
  @override
  int monotonicMilliseconds() => monotonic;
}

final class MemoryDuelStore implements DuelProtectedStore {
  final values = <String, String>{};
  final writes = <String>[];
  int failWrite = -1, writeCount = 0;
  bool failClear = false;
  @override
  Future<Result<String?>> read(String partition) async =>
      Success(values[partition]);
  @override
  Future<Result<void>> write(String partition, String value) async {
    writes.add(partition);
    writeCount++;
    if (writeCount == failWrite) {
      return const Failed(
        AppFailure(code: FailureCode.storage, message: 'denied'),
      );
    }
    values[partition] = value;
    return const Success(null);
  }

  @override
  Future<Result<void>> clear(String partition) async {
    if (failClear) {
      return const Failed(
        AppFailure(code: FailureCode.storage, message: 'denied'),
      );
    }
    values.remove(partition);
    return const Success(null);
  }
}

typedef WireStep = FutureOr<DuelWireResponse> Function(
  Map<String, Object?> command,
);

final class ScriptedDuelTransport implements DuelTransport {
  final steps = <WireStep>[];
  final commands = <Map<String, Object?>>[];
  bool closed = false;
  int cancellations = 0;
  @override
  Future<DuelWireResponse> post(Map<String, Object?> command) async {
    commands.add(
      Map<String, Object?>.from(jsonDecode(jsonEncode(command)) as Map),
    );
    if (steps.isEmpty) throw StateError('Unexpected request');
    return steps.removeAt(0)(command);
  }

  @override
  void cancelPending() {
    cancellations++;
  }

  @override
  void close() {
    closed = true;
    cancelPending();
  }
}

DuelWireResponse wire(Map<String, Object?> snapshot) => DuelWireResponse(
  status: 200,
  body: jsonEncode(snapshot),
  headers: {'x-geodecoder-duel-protocol': '2'},
);
DuelWireResponse wireError(
  String error,
  int status, {
  String? retryAfter,
  bool protocol = true,
}) => DuelWireResponse(
  status: status,
  body: jsonEncode({'ok': false, 'error': error}),
  headers: {
    if (protocol) 'x-geodecoder-duel-protocol': '2',
    'retry-after': ?retryAfter,
  },
);

Map<String, Object?> question(
  int index, {
  bool settled = false,
  bool hint = false,
}) => {
  'id': settled
      ? ['P1', 'P2', 'S1', 'S2', 'K1', 'K2', 'C1', 'C2', 'B1', 'B2'][index]
      : 'duel-$index',
  'index': index,
  'topic': 'properties',
  'copy': {
    for (final language in ['ms', 'en'])
      language: {
        'prompt': language == 'en'
            ? 'Identify this solid.'
            : 'Kenal pasti pepejal ini.',
        'lines': ['6 square faces'],
        if (hint || settled) 'hint': 'All faces are equal.',
      },
  },
  if (settled) 'shape': 'cube',
};
Map<String, Object?> settledAnswer(
  int index, {
  String outcome = 'correct',
  bool hint = false,
}) => {
  'id': ['P1', 'P2', 'S1', 'S2', 'K1', 'K2', 'C1', 'C2', 'B1', 'B2'][index],
  'shape': 'cube',
  'topic': 'properties',
  'outcome': outcome,
  'hint': hint,
  'failedAt': outcome == 'wrong' ? 'solid' : null,
  'elapsed': 5000,
  'firstTry': outcome == 'correct',
  'question': question(index, settled: true),
  'attempts': {
    'solid': outcome == 'correct'
        ? 'cube'
        : outcome == 'wrong'
        ? 'cone'
        : null,
    'net': outcome == 'correct' ? 'cube' : null,
  },
};
Map<String, Object?> player({
  bool me = false,
  int answered = 0,
  int score = 0,
  int mistakes = 0,
  int hints = 0,
  String stage = 'solid',
  bool ready = false,
  int? finishedAt,
}) => {
  'id': me ? meId : friendId,
  'slot': me ? 1 : 2,
  'name': me ? 'Player one' : 'Player two',
  'ready': ready,
  'answered': answered,
  'stage': stage,
  'score': score,
  'mistakes': mistakes,
  'skipped': answered - score - mistakes,
  'hints': hints,
  'finishedAt': finishedAt,
  'elapsed': answered > 0 ? 5000 : 0,
  'forfeited': false,
  'lastSeenAt': testNow,
};
Map<String, Object?> snapshot({
  String status = 'waiting',
  int seq = 0,
  int now = testNow,
  String stage = 'solid',
  bool hintUsed = false,
  List<Map<String, Object?>> answers = const [],
  bool review = false,
  int? readyAt,
  bool opponent = true,
  bool ready = false,
  String? action,
  String id = roomId,
}) {
  final total = answers.length;
  final me =
      player(
        me: true,
        answered: total,
        ready: ready,
        score: answers.where((a) => a['outcome'] == 'correct').length,
        mistakes: answers.where((a) => a['outcome'] == 'wrong').length,
        hints:
            answers.where((a) => a['hint'] == true).length + (hintUsed ? 1 : 0),
        stage: stage,
        finishedAt: total == 10 ? testNow : null,
      )..addAll({
        'seq': seq,
        'hintUsed': hintUsed,
        'reviewPending': review,
        'nextReadyAt': review
            ? readyAt ??
                  now + (answers.last['outcome'] == 'correct' ? 900 : 1800)
            : null,
        'attempts': {'solid': stage == 'net' ? 'cube' : null, 'net': null},
        'answers': answers,
      });
  return {
    'ok': true,
    'protocol': 2,
    'serverNow': now,
    'room': {
      'id': id,
      'code': '123456',
      'status': status,
      'startsAt':
          status == 'waiting' || status == 'expired' || status == 'cancelled'
          ? null
          : status == 'countdown'
          ? testNow + 3000
          : testNow - 10000,
      'deadlineAt':
          status == 'waiting' || status == 'expired' || status == 'cancelled'
          ? null
          : status == 'countdown'
          ? testNow + 903000
          : testNow + 890000,
      'lobbyExpiresAt': testNow + 600000,
      'total': 10,
      'winnerId': status == 'complete' ? meId : null,
      'reason': status == 'complete' ? 'score' : null,
    },
    'me': me,
    'opponent': opponent
        ? player(
            answered: status == 'complete' ? 10 : 0,
            finishedAt: status == 'complete' ? testNow : null,
          )
        : null,
    'currentQuestion': status == 'playing' && !review && total < 10
        ? question(total, hint: hintUsed)
        : null,
    'actionResult': action == null ? null : {'type': action},
  };
}

final class DuelHarness {
  DuelHarness({
    MemoryDuelStore? protectedStore,
    bool configured = true,
    bool timersEnabled = false,
  }) {
    store = protectedStore ?? MemoryDuelStore();
    controller = DuelController(
      sessions: sessions,
      lifecycle: lifecycle,
      store: store,
      transport: configured ? transport : null,
      clock: clock,
      timersEnabled: timersEnabled,
      sleep: (_) async {},
    );
  }
  final sessions = SessionController.guest(
    guestId: 'duel-test',
    sessionId: 'session-one',
  );
  final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
  final clock = DuelTestClock();
  final transport = ScriptedDuelTransport();
  late final MemoryDuelStore store;
  late final DuelController controller;
  Future<void> enter([Map<String, Object?>? state]) async {
    transport.steps.add((_) => wire(state ?? snapshot()));
    final result = await controller.create('Player one');
    if (!result.isSuccess) {
      throw StateError('Fixture entry failed: ${controller.errorCode}');
    }
  }

  Future<void> close() async {
    controller.dispose();
    lifecycle.dispose();
    await sessions.dispose();
  }
}
