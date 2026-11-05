import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/features/duel/duel_feature.dart';

import 'duel_test_support.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late DuelHarness h;
  setUp(() {
    h = DuelHarness();
  });
  tearDown(() async {
    await h.close();
  });

  test('no configuration is honest and sends no request', () async {
    await h.close();
    h = DuelHarness(configured: false);
    expect((await h.controller.initialize()).isSuccess, isTrue);
    expect(h.controller.configured, isFalse);
    expect(
      (await h.controller.create('Player one')).failureOrNull?.code,
      FailureCode.unavailable,
    );
    expect(h.transport.commands, isEmpty);
  });
  test('lost create acknowledgement resends identical protected capability payload', () async {
    h.transport.steps.addAll([
      (_) => throw const SocketException('lost acknowledgement'),
      (_) => wire(snapshot()),
    ]);
    expect((await h.controller.create('  Player   one ')).isSuccess, isTrue);
    expect(h.transport.commands, hasLength(2));
    expect(
      jsonEncode(h.transport.commands[0]),
      jsonEncode(h.transport.commands[1]),
    );
    expect(h.transport.commands.first.keys.toSet(), {
      'protocol',
      'action',
      'token',
      'name',
    });
    expect(h.transport.commands.first['name'], 'Player one');
    expect(
      h.transport.commands.first['token'],
      matches(RegExp(r'^[a-f0-9]{64}$')),
    );
    expect(h.store.writeCount, 2);
    expect(jsonDecode(h.store.values.values.single)['pending'], isNull);
    expect(h.controller.pending, isFalse);
  });
  test(
    'lost scan acknowledgement retransmits the exact seq and selected pair',
    () async {
      await h.enter(snapshot(status: 'playing', seq: 7));
      h.transport.steps.addAll([
        (_) => throw const SocketException('lost'),
        (_) => wire(
          snapshot(status: 'playing', stage: 'net', seq: 8, action: 'solid'),
        ),
      ]);
      expect(
        (await h.controller.scan(
          GeometryShape.cube,
          kind: GeometryCardKind.solid,
        )).isSuccess,
        isTrue,
      );
      final commands = h.transport.commands.skip(1).toList();
      expect(commands[0], commands[1]);
      expect(commands[0].keys.toSet(), {
        'protocol',
        'action',
        'token',
        'roomId',
        'seq',
        'questionIndex',
        'kind',
        'shape',
        'target',
      });
      expect(commands[0], containsPair('seq', 8));
      expect(commands[0], containsPair('questionIndex', 0));
      expect(commands[0], containsPair('target', 'r1'));
      expect(h.controller.snapshot!.me.stage, GeometryCardKind.net);
    },
  );
  test(
    'protected write failure blocks all HTTP and keeps recovery data',
    () async {
      h.store.failWrite = 1;
      expect(
        (await h.controller.create('Player one')).failureOrNull?.code,
        FailureCode.storage,
      );
      expect(h.transport.commands, isEmpty);
      expect(h.controller.pending, isTrue);
      h.transport.steps.add((_) => wire(snapshot()));
      expect((await h.controller.resume()).isSuccess, isTrue);
      expect(h.transport.commands, hasLength(1));
    },
  );
  test(
    'acknowledgement clear failure survives restart and same-sequence replay',
    () async {
      await h.enter(snapshot(status: 'playing', seq: 2));
      h.store.failWrite = 4;
      h.transport.steps.add(
        (_) => wire(snapshot(status: 'playing', stage: 'net', seq: 3)),
      );
      expect(
        (await h.controller.scan(
          GeometryShape.cube,
          kind: GeometryCardKind.solid,
        )).failureOrNull?.code,
        FailureCode.storage,
      );
      final command = h.transport.commands.last;
      expect(h.controller.pending, isTrue);
      final protected = h.store;
      await h.close();
      h = DuelHarness(protectedStore: protected);
      h.transport.steps.add(
        (_) => wire(snapshot(status: 'playing', stage: 'net', seq: 3)),
      );
      expect((await h.controller.resume()).isSuccess, isTrue);
      expect(h.transport.commands.single, command);
      expect(h.controller.pending, isFalse);
    },
  );
  test(
    'unknown delivery stays pending and refresh reconciles accepted sequence',
    () async {
      await h.enter(snapshot(status: 'playing', seq: 4));
      h.transport.steps.addAll([
        (_) => throw const SocketException('offline'),
        (_) => throw const SocketException('offline'),
      ]);
      await h.controller.hint();
      expect(h.controller.pending, isTrue);
      h.transport.steps.add(
        (_) => wire(snapshot(status: 'playing', seq: 5, hintUsed: true)),
      );
      expect((await h.controller.refresh()).isSuccess, isTrue);
      expect(h.transport.commands.last['action'], 'state');
      expect(h.controller.pending, isFalse);
      expect(h.controller.snapshot!.hintUsed, isTrue);
    },
  );
  test(
    'wrong and skipped review gates require 1800 ms and explicit advance',
    () async {
      for (final outcome in ['wrong', 'skipped']) {
        if (h.controller.hasSession) {
          await h.close();
          h = DuelHarness();
        }
        await h.enter(
          snapshot(
            status: 'playing',
            seq: 6,
            answers: [settledAnswer(0, outcome: outcome)],
            review: true,
          ),
        );
        expect(h.controller.reviewRemaining, 1800);
        expect(h.controller.canContinue, isFalse);
        expect((await h.controller.advance()).isSuccess, isFalse);
        // Reconcile after a local premature action, then cross the server gate.
        h.transport.steps.add(
          (_) => wire(
            snapshot(
              status: 'playing',
              seq: 6,
              answers: [settledAnswer(0, outcome: outcome)],
              review: true,
              readyAt: testNow + 1800,
            ),
          ),
        );
        await h.controller.refresh();
        h.clock.elapse(1799);
        expect(h.controller.canContinue, isFalse);
        h.clock.elapse(1);
        expect(h.controller.canContinue, isTrue);
        h.transport.steps.add(
          (_) => wire(
            snapshot(
              status: 'playing',
              seq: 7,
              now: testNow + 1800,
              answers: [settledAnswer(0, outcome: outcome)],
              action: 'advanced',
            ),
          ),
        );
        expect((await h.controller.advance()).isSuccess, isTrue);
        expect(h.transport.commands.last['questionIndex'], 0);
        expect(h.controller.snapshot!.currentQuestion!.index, 1);
      }
    },
  );
  test(
    'durable final correct review advances after room complete at 900 ms',
    () async {
      final answers = List.generate(10, (i) => settledAnswer(i));
      await h.enter(
        snapshot(status: 'complete', seq: 30, answers: answers, review: true),
      );
      expect(h.controller.snapshot!.room.status, DuelRoomStatus.complete);
      expect(h.controller.snapshot!.review, isNotNull);
      expect(h.controller.reviewRemaining, 900);
      final protected = h.store;
      await h.close();
      h = DuelHarness(protectedStore: protected);
      h.transport.steps.add(
        (_) => wire(
          snapshot(
            status: 'complete',
            seq: 30,
            answers: answers,
            review: true,
            readyAt: testNow + 900,
          ),
        ),
      );
      await h.controller.resume();
      h.clock.elapse(900);
      h.transport.steps.add(
        (_) => wire(
          snapshot(
            status: 'complete',
            seq: 31,
            now: testNow + 900,
            answers: answers,
            action: 'advanced',
          ),
        ),
      );
      expect((await h.controller.advance(automatic: true)).isSuccess, isTrue);
      expect(h.transport.commands.last, containsPair('questionIndex', 9));
      expect(h.transport.commands.last, containsPair('seq', 31));
      expect(h.controller.snapshot!.reviewPending, isFalse);
      expect(h.controller.snapshot!.me.score, 10);
      expect(h.controller.snapshot!.me.finishedAt, testNow);
    },
  );
  test('single-flight refresh coalesces concurrent callers', () async {
    await h.enter();
    final response = Completer<DuelWireResponse>();
    h.transport.steps.add((_) => response.future);
    final one = h.controller.refresh(), two = h.controller.refresh();
    expect(identical(one, two), isTrue);
    expect(h.transport.commands, hasLength(2));
    response.complete(wire(snapshot()));
    await Future.wait([one, two]);
  });
  test('late failed poll cannot overwrite a newer accepted mutation', () async {
    await h.enter(snapshot(status: 'playing'));
    final poll = Completer<DuelWireResponse>();
    h.transport.steps.add((_) => poll.future);
    final refreshing = h.controller.refresh();
    h.transport.steps.add(
      (_) => wire(snapshot(status: 'playing', seq: 1, stage: 'net')),
    );
    await h.controller.scan(GeometryShape.cube, kind: GeometryCardKind.solid);
    poll.completeError(const SocketException('old poll'));
    await refreshing;
    expect(h.controller.connected, isTrue);
    expect(h.controller.errorCode, isNull);
    expect(h.controller.snapshot!.seq, 1);
  });
  test(
    'numeric Retry-After blocks sends and survives a successful old poll',
    () async {
      await h.enter(snapshot(status: 'playing'));
      h.transport.steps.add(
        (_) => wireError('rate_limited', 429, retryAfter: '2'),
      );
      await h.controller.skip();
      expect(h.controller.retryRemaining.inMilliseconds, 2000);
      final count = h.transport.commands.length;
      await h.controller.resume();
      expect(h.transport.commands, hasLength(count));
      h.clock.elapse(1999);
      expect(h.controller.connected, isFalse);
      h.clock.elapse(1);
      h.transport.steps.add(
        (_) => wire(
          snapshot(
            status: 'playing',
            seq: 1,
            answers: [settledAnswer(0, outcome: 'skipped')],
            review: true,
            now: testNow + 2000,
          ),
        ),
      );
      expect((await h.controller.resume()).isSuccess, isTrue);
      expect(h.transport.commands[count], h.transport.commands[count - 1]);
    },
  );
  test(
    'HTTP-date Retry-After is respected without automatic mutation retry',
    () async {
      await h.enter();
      h.transport.steps.add(
        (_) => wireError(
          'rate_limited',
          429,
          retryAfter: HttpDate.format(
            h.clock.now().add(const Duration(seconds: 7)),
          ),
        ),
      );
      await h.controller.ready();
      expect(h.controller.retryRemaining, const Duration(seconds: 7));
      expect(h.transport.commands, hasLength(2));
    },
  );
  test(
    'non-JSON upstream failure retries the identical pending scan',
    () async {
      await h.enter(snapshot(status: 'playing', seq: 7));
      h.transport.steps.addAll([
        (_) => const DuelWireResponse(
          status: 502,
          body: '<html>Bad gateway</html>',
        ),
        (_) => wire(snapshot(status: 'playing', stage: 'net', seq: 8)),
      ]);
      expect(
        (await h.controller.scan(
          GeometryShape.cube,
          kind: GeometryCardKind.solid,
        )).isSuccess,
        isTrue,
      );
      expect(h.transport.commands[1], h.transport.commands[2]);
      expect(h.controller.snapshot!.seq, 8);
      expect(h.controller.pending, isFalse);
      expect(h.controller.protocolStopped, isFalse);
    },
  );
  test(
    'non-JSON 429 retains the pending command and honors Retry-After',
    () async {
      await h.enter(snapshot(status: 'playing'));
      h.transport.steps.add(
        (_) => const DuelWireResponse(
          status: 429,
          body: 'Too many requests',
          headers: {'retry-after': '3'},
        ),
      );
      final result = await h.controller.hint();
      expect(result.failureOrNull?.code, FailureCode.retryAfter);
      expect(h.controller.retryRemaining, const Duration(seconds: 3));
      expect(h.controller.protocolStopped, isFalse);
      expect(h.controller.pending, isTrue);
      final command = h.transport.commands.last;
      await h.controller.resume();
      expect(h.transport.commands, hasLength(2));
      h.clock.elapse(3000);
      h.transport.steps.add(
        (_) => wire(snapshot(status: 'playing', seq: 1, hintUsed: true)),
      );
      expect((await h.controller.resume()).isSuccess, isTrue);
      expect(h.transport.commands.last, command);
    },
  );
  test(
    'overlapping older poll 429 preserves a newer scan and blocks sends',
    () async {
      await h.enter(snapshot(status: 'playing'));
      final poll = Completer<DuelWireResponse>();
      h.transport.steps.add((_) => poll.future);
      final refreshing = h.controller.refresh();
      h.transport.steps.add(
        (_) => wire(snapshot(status: 'playing', seq: 1, stage: 'net')),
      );
      await h.controller.scan(GeometryShape.cube, kind: GeometryCardKind.solid);
      poll.complete(wireError('rate_limited', 429, retryAfter: '4'));
      await refreshing;
      expect(h.controller.snapshot!.seq, 1);
      expect(h.controller.snapshot!.me.stage, GeometryCardKind.net);
      expect(h.controller.retryRemaining, const Duration(seconds: 4));
      expect(h.controller.connected, isFalse);
      expect(h.controller.pending, isFalse);
      await h.controller.refresh();
      expect(h.transport.commands, hasLength(3));
      h.clock.elapse(4000);
      h.transport.steps.add(
        (_) => wire(snapshot(status: 'playing', seq: 1, stage: 'net')),
      );
      expect((await h.controller.refresh()).isSuccess, isTrue);
      expect(h.controller.connected, isTrue);
    },
  );
  test('overlapping rate limits cannot shorten the current cooldown', () async {
    await h.enter(snapshot(status: 'playing'));
    final poll = Completer<DuelWireResponse>();
    h.transport.steps.add((_) => poll.future);
    final refreshing = h.controller.refresh();
    h.transport.steps.add(
      (_) => wireError('rate_limited', 429, retryAfter: '30'),
    );
    await h.controller.hint();
    h.clock.elapse(1000);
    poll.complete(wireError('rate_limited', 429, retryAfter: '2'));
    await refreshing;
    expect(h.controller.retryRemaining, const Duration(seconds: 29));
    expect(h.controller.pending, isTrue);
    expect(h.transport.commands, hasLength(3));
  });
  test('retired capability network failure returns stale after the next room starts', () async {
    await h.enter(snapshot(status: 'playing'));
    final poll = Completer<DuelWireResponse>();
    h.transport.steps.add((_) => poll.future);
    final refreshing = h.controller.refresh();
    h.transport.steps.add(
      (_) => wire(
        snapshot(
          status: 'complete',
          seq: 1,
          answers: List.generate(
            10,
            (i) => settledAnswer(i, outcome: 'skipped'),
          ),
          action: 'left',
        ),
      ),
    );
    await h.controller.leave(confirmed: true);
    const nextRoom = '44444444-4444-4444-8444-444444444444';
    h.transport.steps.add((_) => wire(snapshot(id: nextRoom)));
    await h.controller.create('New room');
    poll.completeError(const SocketException('retired room'));
    expect((await refreshing).failureOrNull?.code, FailureCode.stale);
    expect(h.controller.snapshot!.room.id, nextRoom);
    expect(h.controller.connected, isTrue);
    expect(h.controller.failure, isNull);
  });
  test(
    'protocol mismatch and redaction violation stop further polling and sends',
    () async {
      await h.enter();
      final incompatible = snapshot()..['protocol'] = 1;
      h.transport.steps.add((_) => wire(incompatible));
      await h.controller.refresh();
      expect(h.controller.protocolStopped, isTrue);
      expect(h.controller.errorCode, 'client_update_required');
      final count = h.transport.commands.length;
      await h.controller.refresh();
      await h.controller.ready();
      expect(h.transport.commands, hasLength(count));
      expect(
        (await h.controller.forgetSession(confirmed: true)).isSuccess,
        isTrue,
      );
      expect(h.controller.hasSession, isFalse);
    },
  );
  test('legacy Edge invalid_request is backend update required', () async {
    h.transport.steps.add(
      (_) => wireError('invalid_request', 400, protocol: false),
    );
    await h.controller.create('Player one');
    expect(h.controller.errorCode, 'backend_update_required');
    expect(h.controller.pending, isTrue);
    expect(h.transport.commands, hasLength(1));
  });
  test(
    'wrong-room response is rejected without replacing accepted room',
    () async {
      await h.enter();
      h.transport.steps.add(
        (_) => wire(snapshot(id: '44444444-4444-4444-8444-444444444444')),
      );
      await h.controller.refresh();
      expect(h.controller.errorCode, 'invalid_response');
      expect(h.controller.snapshot!.room.id, roomId);
      expect(h.controller.protocolStopped, isTrue);
    },
  );
  test('identity epoch cancels delivery and never writes old capability into new owner', () async {
    final response = Completer<DuelWireResponse>();
    h.transport.steps.add((_) => response.future);
    final creating = h.controller.create('Player one');
    await Future<void>.delayed(Duration.zero);
    h.sessions.bindUser(userId: 'other-user', sessionId: 'other-session');
    response.complete(wire(snapshot()));
    await creating;
    await h.controller.initialize();
    expect(h.controller.snapshot, isNull);
    expect(h.controller.hasSession, isFalse);
    expect(h.store.values.keys, isNot(contains('owner:other-user')));
    expect(h.transport.cancellations, 1);
  });
  test('disposal makes delayed network completion inert', () async {
    final response = Completer<DuelWireResponse>();
    h.transport.steps.add((_) => response.future);
    final creating = h.controller.create('Player one');
    await Future<void>.delayed(Duration.zero);
    var events = 0;
    h.controller.addListener(() => events++);
    h.controller.dispose();
    final before = events;
    response.complete(wire(snapshot()));
    await creating;
    expect(events, before);
    expect(h.controller.snapshot, isNull);
    expect(h.transport.closed, isTrue);
  });
  test('background never pauses deadline or review clock; foreground reconciles once', () async {
    await h.enter(
      snapshot(
        status: 'playing',
        seq: 2,
        answers: [settledAnswer(0)],
        review: true,
      ),
    );
    final deadline = h.controller.snapshot!.room.deadlineAt;
    h.lifecycle.setPhase(AppLifecyclePhase.background);
    h.clock.elapse(120000);
    expect(h.controller.serverMilliseconds, testNow + 120000);
    expect(h.controller.reviewRemaining, 0);
    expect(h.controller.canContinue, isFalse);
    h.transport.steps.add(
      (_) => wire(
        snapshot(
          status: 'playing',
          seq: 2,
          now: testNow + 120000,
          answers: [settledAnswer(0)],
          review: true,
          readyAt: testNow + 900,
        ),
      ),
    );
    h.lifecycle.setPhase(AppLifecyclePhase.foreground);
    await h.controller.resume();
    expect(h.controller.snapshot!.room.deadlineAt, deadline);
    expect(h.transport.commands, hasLength(2));
  });
  test('forfeit requires explicit confirmation and server acknowledgment before clearing', () async {
    await h.enter(snapshot(status: 'playing', seq: 12));
    expect(
      (await h.controller.leave(confirmed: false)).failureOrNull?.code,
      FailureCode.cancelled,
    );
    expect(h.transport.commands, hasLength(1));
    expect(h.controller.hasSession, isTrue);
    final answers = List.generate(
      10,
      (i) => settledAnswer(i, outcome: 'skipped'),
    );
    h.transport.steps.add(
      (_) => wire(
        snapshot(status: 'complete', seq: 13, answers: answers, action: 'left'),
      ),
    );
    expect((await h.controller.leave(confirmed: true)).isSuccess, isTrue);
    expect(h.transport.commands.last['action'], 'leave');
    expect(h.transport.commands.last['seq'], 13);
    expect(h.controller.hasSession, isFalse);
    expect(h.store.values, isEmpty);
  });
  test('PIN lifetime, match deadline and authoritative deadline skips stay server owned', () async {
    await h.enter();
    expect(h.controller.snapshot!.room.lobbyExpiresAt - testNow, 600000);
    h.transport.steps.add((_) => wire(snapshot(status: 'countdown', seq: 1)));
    await h.controller.ready();
    final room = h.controller.snapshot!.room;
    expect(room.deadlineAt! - room.startsAt!, 900000);
    h.clock.elapse(900000);
    expect(h.controller.snapshot!.me.answered, 0);
    final answers = List.generate(
      10,
      (i) => settledAnswer(i, outcome: 'skipped'),
    );
    h.transport.steps.add(
      (_) => wire(
        snapshot(
          status: 'complete',
          seq: 1,
          now: testNow + 900000,
          answers: answers,
        ),
      ),
    );
    await h.controller.refresh();
    expect(h.controller.snapshot!.me.skipped, 10);
    expect(h.controller.snapshot!.reviewPending, isFalse);
  });
  test('corrupt protected session has explicit recovery without sending a capability', () async {
    h.store.values[h.sessions.current.partition] = '{broken';
    expect((await h.controller.initialize()).isSuccess, isFalse);
    expect(h.controller.errorCode, 'invalid_session');
    expect(h.controller.canForgetSession, isTrue);
    expect(h.transport.commands, isEmpty);
    await h.controller.forgetSession(confirmed: false);
    expect(h.store.values, isNotEmpty);
    expect(
      (await h.controller.forgetSession(confirmed: true)).isSuccess,
      isTrue,
    );
    expect(h.controller.hasSession, isFalse);
    expect(h.controller.protocolStopped, isFalse);
    await h.enter();
    expect(h.controller.snapshot!.room.id, roomId);
  });
  test(
    'a late old-room response cannot poison the next room under the same actor',
    () async {
      await h.enter(snapshot(status: 'playing'));
      final old = Completer<DuelWireResponse>();
      h.transport.steps.add((_) => old.future);
      final oldRefresh = h.controller.refresh();
      final generation = h.controller.sessionGeneration;
      h.transport.steps.add(
        (_) => wire(
          snapshot(
            status: 'complete',
            seq: 1,
            answers: List.generate(
              10,
              (i) => settledAnswer(i, outcome: 'skipped'),
            ),
            action: 'left',
          ),
        ),
      );
      await h.controller.leave(confirmed: true);
      const nextRoom = '44444444-4444-4444-8444-444444444444';
      h.transport.steps.add((_) => wire(snapshot(id: nextRoom)));
      await h.controller.create('New room');
      expect(h.controller.sessionGeneration, greaterThan(generation));
      old.complete(wire(snapshot(status: 'playing')));
      await oldRefresh;
      expect(h.controller.snapshot!.room.id, nextRoom);
      expect(h.controller.protocolStopped, isFalse);
      expect(h.controller.connected, isTrue);
      expect(h.controller.errorCode, isNull);
      final count = h.transport.commands.length;
      expect(
        (await h.controller.leave(
          confirmed: true,
          expectedGeneration: generation,
        )).failureOrNull?.code,
        FailureCode.stale,
      );
      expect(h.transport.commands, hasLength(count));
    },
  );
  test('failed protected clear after forfeit keeps recovery session until clear succeeds', () async {
    await h.enter(snapshot(status: 'playing'));
    h.store.failClear = true;
    h.transport.steps.add(
      (_) => wire(
        snapshot(
          status: 'complete',
          seq: 1,
          answers: List.generate(
            10,
            (i) => settledAnswer(i, outcome: 'skipped'),
          ),
          action: 'left',
        ),
      ),
    );
    expect(
      (await h.controller.leave(confirmed: true)).failureOrNull?.code,
      FailureCode.storage,
    );
    expect(h.controller.hasSession, isTrue);
    expect(h.store.values, isNotEmpty);
    h.store.failClear = false;
    expect((await h.controller.leave(confirmed: true)).isSuccess, isTrue);
    expect(h.controller.hasSession, isFalse);
    expect(h.transport.commands, hasLength(2));
  });
  test('separate protected keys preserve Auth session and isolate owner partitions', () async {
    const authKey = 'geomath.auth.protected-session.v1';
    FlutterSecureStorage.setMockInitialValues({authKey: 'auth-session'});
    final store = SecureDuelProtectedStore();
    expect(
      (await store.write('guest:a', 'guest-capability')).isSuccess,
      isTrue,
    );
    expect(
      (await store.write('owner:b', 'owner-capability')).isSuccess,
      isTrue,
    );
    expect((await store.read('guest:a')).valueOrNull, 'guest-capability');
    await store.clear('guest:a');
    expect((await store.read('guest:a')).valueOrNull, isNull);
    expect((await store.read('owner:b')).valueOrNull, 'owner-capability');
    final keys = await const FlutterSecureStorage().readAll();
    expect(keys[authKey], 'auth-session');
    expect(
      keys.keys
          .where((key) => key != authKey)
          .every((key) => key.startsWith(SecureDuelProtectedStore.keyPrefix)),
      isTrue,
    );
  });
}
