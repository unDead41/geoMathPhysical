import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/features/feature_localizations.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/classroom/classroom_feature.dart';

import 'classroom_fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SessionController sessions;
  late ClassroomFixtureGateway gateway;
  late ClassroomTestClock clock;
  late ClassroomController c;
  setUp(() {
    sessions = SessionController.guest(
      guestId: 'classroom-test',
      sessionId: 'guest',
    );
    sessions.bindUser(userId: teacherA, sessionId: 'teacher-a');
    gateway = ClassroomFixtureGateway(sessions);
    clock = ClassroomTestClock();
    c = ClassroomController(
      repository: ClassroomRepository(gateway: gateway, sessions: sessions),
      sessions: sessions,
      clock: clock,
      random: ClassroomTestRandom(),
    );
  });
  tearDown(() async {
    c.dispose();
    await sessions.dispose();
  });
  Future<void> load({Map<String, Object?>? data}) async {
    gateway.data(data ?? snapshotFixture());
    expect(await c.refresh(), isTrue);
  }

  Future<void> studentRoom({
    String status = 'playing',
    Map<String, Object?>? attempt,
    bool archived = false,
  }) async {
    sessions.bindUser(userId: studentA, sessionId: 'student-a');
    final data = snapshotFixture(
      user: studentA,
      role: 'student',
      status: status,
      detailRoom: roomA,
      attempt: attempt,
      archived: archived,
    );
    await load(data: data);
    gateway.data(data);
    expect(await c.openRoom(roomA), isTrue);
  }

  test(
    'feature contribution is lazy, uniquely named and has valid bilingual keys',
    () {
      final feature = classroomFeature();
      expect(feature.id, 'classroom');
      expect(feature.routes.single.name, 'cloud-game-classes');
      expect(feature.routes.single.path, '/classes');
      expect(feature.migrations, isEmpty);
      final strings = FeatureLocalizationRegistry(feature.localizations);
      expect(strings.lookup('en', 'classroom.rename.class'), 'Rename class');
      expect(
        strings.lookup('ms', 'classroom.rename.class'),
        'Sunting nama kelas',
      );
      expect(gateway.calls, isEmpty);
    },
  );

  test(
    'boundary preserves leading zero PIN and counts Unicode codepoints',
    () async {
      expect(ClassroomValidation.pin('001234'), isTrue);
      for (final pin in ['12345', '1234567', '１２３４５６', ' 123456', '12345a']) {
        expect(ClassroomValidation.pin(pin), isFalse);
      }
      expect(ClassroomValidation.name('😀' * 60), isTrue);
      expect(ClassroomValidation.name('😀' * 61), isFalse);
      expect(ClassroomValidation.name('ab\ncd'), isFalse);
      final repository = c.repository;
      for (final command in [
        ClassroomCommand('cancel_invite', {
          'invite_id': inviteA,
          'expected_revision': 3,
        }),
        ClassroomCommand('rename_class', {
          'class_id': classA,
          'name': 'Nama',
          'expected_revision': 3.0,
        }),
        ClassroomCommand('join_pin', {'pin': 123456}),
      ]) {
        expect(
          (await repository.send(command, sessions.current)).failure?.code,
          FailureCode.invalid,
        );
      }
      expect(gateway.calls, isEmpty);
      sessions.bindUser(userId: studentA, sessionId: 'student-a');
      await load(
        data: snapshotFixture(user: studentA, role: 'student'),
      );
      gateway.data(snapshotFixture(user: studentA, role: 'student'));
      expect(
        await c.perform(ClassroomCommand('join_pin', {'pin': '001234'})),
        isTrue,
      );
      expect(gateway.calls.last.payload, {'pin': '001234'});
    },
  );

  test(
    'management wire uses exact class/room revision and invite UUID only',
    () async {
      await load();
      c.editClass(c.snapshot!.classes.first, 'rename_class');
      c.management!.name = '  Nama baharu  ';
      gateway.data(snapshotFixture(revision: 4, name: 'Nama baharu'));
      expect(await c.saveManagement(), isTrue);
      expect(gateway.calls.last.name, 'geo_action');
      expect(gateway.calls.last.parameters, {
        'action': 'rename_class',
        'payload': {
          'class_id': classA,
          'expected_revision': 3,
          'name': 'Nama baharu',
        },
      });
      c.editRoom(c.snapshot!.rooms.first, 'rename_room');
      c.management!.name = 'Bilik lain';
      gateway.data(snapshotFixture(revision: 5));
      expect(await c.saveManagement(), isTrue);
      expect(gateway.calls.last.payload, {
        'room_id': roomA,
        'expected_revision': 4,
        'name': 'Bilik lain',
      });
      c.removeMember(
        c.snapshot!.classes.first,
        c.snapshot!.classes.first.members.first,
      );
      gateway.data(snapshotFixture(revision: 6));
      expect(await c.saveManagement(), isTrue);
      expect(gateway.calls.last.payload, {
        'class_id': classA,
        'user_id': studentA,
        'expected_revision': 5,
      });
      c.editInvite(c.snapshot!.classes.first.invites.first, cancel: true);
      gateway.data(snapshotFixture());
      expect(await c.saveManagement(), isTrue);
      expect(gateway.calls.last.payload, {'invite_id': inviteA});
    },
  );

  test(
    'transport status takes precedence over an untrusted application error',
    () async {
      final command = ClassroomCommand('rename_class', {
        'class_id': classA,
        'expected_revision': 3,
        'name': 'Draft name',
      });
      for (final status in [500, 503, 504]) {
        gateway.data({
          'error': {'code': 'forbidden'},
        }, status: status);
        final response = await c.repository.send(command, sessions.current);
        expect(response.failure?.code, FailureCode.network);
        expect(response.uncertain, isTrue);
      }
      gateway.replies.add(
        Success(
          CloudReply(
            data: {
              'error': {'code': 'request_failed'},
            },
            statusCode: 429,
            retryAfter: const Duration(seconds: 45),
          ),
        ),
      );
      final limited = await c.repository.send(command, sessions.current);
      expect(limited.failure?.code, FailureCode.retryAfter);
      expect(limited.failure?.retryAfter, const Duration(seconds: 45));
      expect(limited.uncertain, isFalse);
    },
  );

  test('two teachers cannot mutate each other class or room even with a projection', () async {
    await load();
    final count = gateway.calls.length;
    for (final command in [
      ClassroomCommand('rename_class', {
        'class_id': classB,
        'expected_revision': 3,
        'name': 'Foreign',
      }),
      ClassroomCommand('set_room', {'room_id': roomB, 'status': 'playing'}),
      ClassroomCommand('rotate_pin', {'kind': 'class', 'id': classB}),
    ]) {
      expect(await c.perform(command), isFalse);
      expect(c.failure?.code, FailureCode.unauthorized);
    }
    expect(gateway.calls.length, count);
    sessions.bindUser(userId: teacherB, sessionId: 'teacher-b');
    await load(data: snapshotFixture(user: teacherB));
    gateway.data(snapshotFixture(user: teacherB));
    expect(
      await c.perform(
        ClassroomCommand('rename_class', {
          'class_id': classB,
          'expected_revision': 3,
          'name': 'Own B',
        }),
      ),
      isTrue,
    );
  });

  test('CRUD capability absent leaves baseline class actions but blocks management', () async {
    await load(data: snapshotFixture(capability: false));
    final count = gateway.calls.length;
    c.editClass(c.snapshot!.classes.first, 'rename_class');
    expect(c.management, isNull);
    expect(
      await c.perform(
        ClassroomCommand('delete_room', {
          'room_id': roomA,
          'expected_revision': 3,
        }),
      ),
      isFalse,
    );
    expect(c.failure?.code, FailureCode.unavailable);
    expect(gateway.calls.length, count);
    gateway.data(snapshotFixture(capability: false));
    expect(
      await c.perform(
        ClassroomCommand('create_room', {
          'class_id': classA,
          'name': 'New room',
        }),
      ),
      isTrue,
    );
  });

  test(
    'conflict preserves draft until explicit refresh takes fresh revision',
    () async {
      await load();
      c.editClass(c.snapshot!.classes.first, 'rename_class');
      final draft = c.management!;
      draft.name = 'Unsaved work';
      gateway.error('conflict');
      expect(await c.saveManagement(), isFalse);
      expect(identical(c.management, draft), isTrue);
      expect(draft.name, 'Unsaved work');
      expect(draft.revision, 3);
      expect(c.stale, isTrue);
      gateway.data(snapshotFixture(revision: 9, name: 'Concurrent name'));
      expect(await c.refresh(), isTrue);
      expect(draft.revision, 3);
      expect(draft.serverName, 'Kelas A');
      gateway.data(snapshotFixture(revision: 9, name: 'Concurrent name'));
      expect(await c.refreshManagement(), isTrue);
      expect(draft.name, 'Unsaved work');
      expect(draft.serverName, 'Concurrent name');
      expect(draft.revision, 9);
      gateway.data(snapshotFixture(revision: 10));
      expect(await c.saveManagement(), isTrue);
      expect(gateway.calls.last.payload['expected_revision'], 9);
    },
  );

  test('stale invitation never cancels a reissued capability UUID', () async {
    await load();
    c.editInvite(c.snapshot!.classes.first.invites.first, cancel: true);
    final draft = c.management!;
    gateway.data(snapshotFixture(invitation: inviteB));
    expect(await c.refreshManagement(), isTrue);
    expect(draft.id, inviteA);
    final count = gateway.calls.length;
    expect(await c.saveManagement(), isFalse);
    expect(c.failure?.code, FailureCode.conflict);
    expect(gateway.calls.length, count);
    expect(c.snapshot!.classes.first.invites.single.id, inviteB);
    sessions.bindUser(userId: studentA, sessionId: 'student-a');
    await load(
      data: snapshotFixture(user: studentA, role: 'student'),
    );
    c.editInvite(c.snapshot!.invites.single, cancel: false);
    gateway.data(snapshotFixture(user: studentA, role: 'student'));
    expect(await c.saveManagement(), isTrue);
    expect(gateway.calls.last.payload, {'invite_id': inviteA});
  });

  test('lost management acknowledgement blocks retry until explicit server reconciliation', () async {
    await load();
    c.editClass(c.snapshot!.classes.first, 'archive_class');
    gateway.lost();
    expect(await c.saveManagement(), isFalse);
    expect(c.requiresReconciliation, isTrue);
    final count = gateway.calls.length;
    expect(await c.saveManagement(), isFalse);
    expect(gateway.calls.length, count);
    gateway.data(
      snapshotFixture(revision: 4, parentArchived: true, pin: false),
    );
    expect(await c.refresh(), isTrue);
    expect(c.requiresReconciliation, isTrue);
    expect(c.canWrite, isFalse);
    gateway.data(
      snapshotFixture(revision: 4, parentArchived: true, pin: false),
    );
    expect(await c.refreshManagement(), isTrue);
    expect(c.requiresReconciliation, isFalse);
    expect(c.management!.revision, 4);
    expect(c.snapshot!.classes.first.archived, isTrue);
    expect(c.snapshot!.classes.first.pin, isNull);
    expect(gateway.calls.where((r) => r.action == 'archive_class').length, 1);
  });

  test(
    'closed, playing and archived lifecycle guards stop unsafe actions',
    () async {
      await load(data: snapshotFixture(status: 'playing'));
      var count = gateway.calls.length;
      for (final command in [
        ClassroomCommand('archive_class', {
          'class_id': classA,
          'expected_revision': 3,
        }),
        ClassroomCommand('archive_room', {
          'room_id': roomA,
          'expected_revision': 3,
        }),
        ClassroomCommand('remove_member', {
          'class_id': classA,
          'user_id': studentA,
          'expected_revision': 3,
        }),
      ]) {
        expect(await c.perform(command), isFalse);
      }
      expect(gateway.calls.length, count);
      await load(
        data: snapshotFixture(
          status: 'closed',
          parentArchived: true,
          pin: false,
        ),
      );
      count = gateway.calls.length;
      for (final command in [
        ClassroomCommand('set_room', {'room_id': roomA, 'status': 'playing'}),
        ClassroomCommand('rotate_pin', {'kind': 'room', 'id': roomA}),
        ClassroomCommand('create_room', {'class_id': classA, 'name': 'Room'}),
      ]) {
        expect(await c.perform(command), isFalse);
      }
      expect(gateway.calls.length, count);
      c.editClass(c.snapshot!.classes.first, 'restore_class');
      gateway.data(snapshotFixture(revision: 4, status: 'closed', pin: false));
      expect(await c.saveManagement(), isTrue);
      expect(c.snapshot!.rooms.first.closed, isTrue);
      expect(c.snapshot!.classes.first.pin, isNull);
    },
  );

  test('server denial purges board attempt draft and old class data', () async {
    await studentRoom(attempt: attemptFixture());
    gateway.data({'state': attemptFixture()});
    expect(await c.startAttempt(), isTrue);
    expect(c.attempt, isNotNull);
    gateway.error('forbidden');
    expect(await c.refresh(), isFalse);
    expect(c.denied, isTrue);
    expect(c.snapshot, isNull);
    expect(c.attempt, isNull);
    expect(c.selectedRoomId, isNull);
    expect(c.management, isNull);
  });

  test(
    'late account A response cannot populate account B after logout/login',
    () async {
      final response = Completer<Result<CloudReply>>();
      gateway.replies.add(response.future);
      final flight = c.refresh();
      await Future<void>.delayed(Duration.zero);
      sessions.logout();
      sessions.bindUser(userId: studentB, sessionId: 'student-b');
      gateway.data(snapshotFixture(user: studentB, role: 'student'));
      expect(await c.refresh(), isTrue);
      response.complete(Success(CloudReply(data: snapshotFixture())));
      expect(await flight, isFalse);
      expect(c.snapshot!.profile.id, studentB);
      expect(c.attempt, isNull);
    },
  );

  test('late room A read is discarded after returning to class B', () async {
    await load();
    final response = Completer<Result<CloudReply>>();
    gateway.replies.add(response.future);
    final flight = c.openRoom(roomA);
    await Future<void>.delayed(Duration.zero);
    gateway.data(snapshotFixture());
    c.dashboard();
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    c.selectClass(classB);
    response.complete(
      Success(CloudReply(data: snapshotFixture(detailRoom: roomA))),
    );
    expect(await flight, isFalse);
    expect(c.selectedRoomId, isNull);
    expect(c.currentClass!.id, classB);
    expect(c.currentRoom, isNull);
  });

  test('existing closed attempt is viewable with identical ID and no new start RPC', () async {
    await studentRoom(
      status: 'closed',
      attempt: attemptFixture(status: 'closed', score: 4),
    );
    final count = gateway.calls.length;
    expect(await c.startAttempt(), isTrue);
    expect(c.attempt!.id, attemptA);
    expect(c.attempt!.score, 4);
    expect(gateway.calls.length, count);
    expect(await c.gameCommand('answer', shape: 'pyramid'), isFalse);
    expect(gateway.calls.length, count);
  });

  test('answer lost acknowledgement retries identical event and score comes only from server', () async {
    await studentRoom();
    gateway.data({'state': attemptFixture()});
    expect(await c.startAttempt(), isTrue);
    gateway.lost();
    expect(await c.gameCommand('answer', shape: 'pyramid'), isFalse);
    final first = gateway.calls.last;
    expect(c.attempt!.stage, 'solid');
    expect(c.attempt!.score, 0);
    expect(c.pendingGame, isNotNull);
    expect(await c.gameCommand('answer', shape: 'cube'), isFalse);
    gateway.data({
      'state': attemptFixture(stage: 'net'),
      'result': {'type': 'correct_r1'},
    });
    expect(await c.retryPendingGame(), isTrue);
    expect(gateway.calls.last.parameters, first.parameters);
    expect(c.attempt!.stage, 'net');
    expect(c.attempt!.score, 0);
    expect(c.pendingGame, isNull);
    gateway.data({
      'state': attemptFixture(status: 'feedback', score: 1, ready: 900),
      'result': {'type': 'correct'},
    });
    expect(await c.gameCommand('answer', shape: 'pyramid'), isTrue);
    expect(gateway.calls.last.payload['target'], 'r2');
    expect(gateway.calls.last.payload['kind'], 'net');
    expect(
      gateway.calls.last.payload['event_id'],
      isNot(first.payload['event_id']),
    );
    expect(c.attempt!.score, 1);
    final count = gateway.calls.length;
    expect(await c.gameCommand('advance'), isFalse);
    expect(gateway.calls.length, count);
    clock.milliseconds += 900;
    gateway.data({'state': attemptFixture(index: 1, score: 1)});
    expect(await c.gameCommand('advance'), isTrue);
    expect(c.attempt!.index, 1);
  });

  test('archived start is blocked and removed membership snapshot clears selected scope', () async {
    await studentRoom(archived: true);
    final count = gateway.calls.length;
    expect(await c.startAttempt(), isFalse);
    expect(gateway.calls.length, count);
    gateway.data(
      snapshotFixture(user: studentA, role: 'student', removed: true),
    );
    expect(await c.refresh(), isTrue);
    expect(c.selectedRoomId, isNull);
    expect(c.attempt, isNull);
    expect(c.currentClass!.id, classB);
  });

  test(
    'clock projections advance answering time but do not mutate official state',
    () async {
      await studentRoom();
      gateway.data({'state': attemptFixture(elapsed: 1200)});
      expect(await c.startAttempt(), isTrue);
      clock.milliseconds = 4500;
      expect(c.answeringElapsedMs, 5700);
      expect(c.attempt!.elapsed, 1200);
      expect(c.attempt!.score, 0);
      gateway.data({
        'state': attemptFixture(status: 'review', ready: 1800, elapsed: 5700),
      });
      expect(await c.gameCommand('skip'), isTrue);
      clock.milliseconds += 1800;
      expect(c.answeringElapsedMs, 5700);
      expect(c.reviewRemainingMs, 0);
    },
  );

  test(
    'background pauses polls and foreground restores server state before play',
    () async {
      c.dispose();
      final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
      addTearDown(lifecycle.dispose);
      c = ClassroomController(
        repository: ClassroomRepository(gateway: gateway, sessions: sessions),
        sessions: sessions,
        clock: clock,
        lifecycle: lifecycle,
      );
      gateway.respond = (r) => Success(CloudReply(data: snapshotFixture()));
      c.setVisible(true);
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);
      final count = gateway.calls.length;
      lifecycle.setPhase(AppLifecyclePhase.background);
      expect(gateway.calls.length, count);
      lifecycle.setPhase(AppLifecyclePhase.foreground);
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);
      expect(gateway.calls.length, count + 1);
      c.setVisible(false);
    },
  );

  test(
    'verified bank has all 15 presentation questions and rejects corruption',
    () async {
      final bank = (await ClassroomBank(
        bundle: ClassroomFileAssets(),
      ).load()).valueOrNull!;
      expect(bank.length, 15);
      expect(
        bank['P1']!.localizedPrompt(AppLanguage.en),
        contains('square base'),
      );
      expect(
        bank['P1']!.localizedPrompt(AppLanguage.ms),
        contains('segi empat sama'),
      );
      expect(
        (await ClassroomBank(
          bundle: ClassroomFileAssets(corrupt: true),
        ).load()).failureOrNull?.code,
        FailureCode.unavailable,
      );
      expect(
        (await ClassroomBank(
          bundle: ClassroomFileAssets(missing: true),
        ).load()).failureOrNull?.code,
        FailureCode.unavailable,
      );
    },
  );

  test('malformed server identity or projection fails closed without cross-account cache', () async {
    gateway.data(snapshotFixture(user: teacherB));
    expect(await c.refresh(), isFalse);
    expect(c.snapshot, isNull);
    expect(c.failure?.code, FailureCode.stale);
    gateway.data({...snapshotFixture(), 'server_now': 'not-a-date'});
    expect(await c.refresh(), isFalse);
    expect(c.snapshot, isNull);
    gateway.data({
      'error': {'code': 'forbidden'},
    }, status: 403);
    expect(await c.refresh(), isFalse);
    expect(c.denied, isTrue);
  });

  test(
    'PIN uses server expiry and archive never invents a replacement',
    () async {
      await load();
      final entity = c.snapshot!.classes.first;
      expect(entity.activePin(c.serverTime), '001234');
      clock.milliseconds = const Duration(days: 1).inMilliseconds;
      expect(entity.activePin(c.serverTime), isNull);
      await load(data: snapshotFixture(parentArchived: true));
      expect(c.snapshot!.classes.first.activePin(c.serverTime), isNull);
      expect(c.snapshot!.rooms.first.archived, isTrue);
    },
  );

  test(
    'server not_empty denial preserves delete draft without automatic retry',
    () async {
      await load();
      c.editRoom(c.snapshot!.rooms.first, 'delete_room');
      final draft = c.management;
      gateway.error('not_empty');
      expect(await c.saveManagement(), isFalse);
      expect(c.management, same(draft));
      expect(c.serverCode, 'not_empty');
      expect(c.snapshot!.rooms.first.id, roomA);
      expect(gateway.calls.where((r) => r.action == 'delete_room').length, 1);
      expect(await c.saveManagement(), isFalse);
      expect(gateway.calls.where((r) => r.action == 'delete_room').length, 1);
    },
  );

  test('game event conflict refreshes state without replacing its event automatically', () async {
    await studentRoom();
    gateway.data({'state': attemptFixture()});
    await c.startAttempt();
    gateway.error('event_conflict');
    expect(await c.gameCommand('answer', shape: 'pyramid'), isFalse);
    expect(c.failure?.code, FailureCode.conflict);
    expect(c.pendingGame, isNull);
    expect(c.attempt!.score, 0);
    final count = gateway.calls.where((r) => r.action == 'answer').length;
    gateway.data(
      snapshotFixture(
        user: studentA,
        role: 'student',
        status: 'playing',
        detailRoom: roomA,
        attempt: attemptFixture(stage: 'net'),
      ),
    );
    expect(await c.refresh(explicit: true), isTrue);
    expect(c.attempt!.stage, 'net');
    expect(gateway.calls.where((r) => r.action == 'answer').length, count);
  });

  test(
    'leaving an unresolved game action reconciles before future resume',
    () async {
      await studentRoom();
      gateway.data({'state': attemptFixture()});
      await c.startAttempt();
      gateway.lost();
      await c.gameCommand('hint');
      expect(c.pendingGame, isNotNull);
      gateway.data(
        snapshotFixture(
          user: studentA,
          role: 'student',
          status: 'playing',
          detailRoom: roomA,
          attempt: attemptFixture(hint: true),
        ),
      );
      c.leaveGame(expectedScope: c.captureScope());
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);
      expect(c.pendingGame, isNull);
      expect(c.requiresReconciliation, isFalse);
      expect(c.attempt, isNull);
      gateway.data({'state': attemptFixture(hint: true)});
      expect(await c.startAttempt(), isTrue);
      expect(c.attempt!.id, attemptA);
      expect(c.attempt!.hintUsed, isTrue);
      expect(gateway.calls.where((r) => r.action == 'hint').length, 1);
    },
  );

  test(
    'late official answer cannot replace another actor projection',
    () async {
      await studentRoom();
      gateway.data({'state': attemptFixture()});
      await c.startAttempt();
      final answer = Completer<Result<CloudReply>>();
      gateway.replies.add(answer.future);
      final flight = c.gameCommand('answer', shape: 'pyramid');
      await Future<void>.delayed(Duration.zero);
      sessions.bindUser(userId: studentB, sessionId: 'student-b');
      await load(
        data: snapshotFixture(user: studentB, role: 'student'),
      );
      answer.complete(
        Success(
          CloudReply(
            data: {'state': attemptFixture(status: 'feedback', score: 1)},
          ),
        ),
      );
      expect(await flight, isFalse);
      expect(c.snapshot!.profile.id, studentB);
      expect(c.attempt, isNull);
      expect(c.pendingGame, isNull);
    },
  );

  testWidgets(
    'dashboard denials stop automatic reads across visibility lifecycle and timers',
    (tester) async {
      final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
      addTearDown(lifecycle.dispose);
      for (final denial in [
        (401, 'unauthenticated'),
        (403, 'forbidden'),
        (200, 'profile_missing'),
      ]) {
        c.dispose();
        c = ClassroomController(
          repository: ClassroomRepository(gateway: gateway, sessions: sessions),
          sessions: sessions,
          clock: clock,
          lifecycle: lifecycle,
        );
        gateway.calls.clear();
        gateway.respond = (_) => gateway.calls.length > 4
            ? const Failed(
                AppFailure(
                  code: FailureCode.unavailable,
                  message: 'test loop fence',
                ),
              )
            : Success(
                CloudReply(
                  data: {
                    'error': {'code': denial.$2},
                  },
                  statusCode: denial.$1,
                ),
              );
        c.setVisible(true);
        await tester.pump(const Duration(milliseconds: 1));
        await tester.pump(const Duration(milliseconds: 1));
        expect(gateway.calls.length, 1);
        expect(c.denied, isTrue);
        expect(c.snapshot, isNull);
        for (var i = 0; i < 3; i++) {
          lifecycle.setPhase(AppLifecyclePhase.background);
          lifecycle.setPhase(AppLifecyclePhase.foreground);
          c.setVisible(false);
          c.setVisible(true);
          await tester.pump(const Duration(minutes: 2));
          expect(gateway.calls.length, 1);
        }
        gateway.data(snapshotFixture());
        final reconcile = c.refresh(explicit: true);
        await tester.pump(const Duration(milliseconds: 1));
        await tester.pump(const Duration(milliseconds: 1));
        expect(await reconcile, isTrue);
        expect(gateway.calls.length, 2);
        expect(c.denied, isFalse);
        expect(c.canWrite, isTrue);
        c.setVisible(false);
      }
    },
  );

  testWidgets(
    'room denial makes one dashboard fallback then stays stopped on dashboard denial',
    (tester) async {
      final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
      addTearDown(lifecycle.dispose);
      c.dispose();
      c = ClassroomController(
        repository: ClassroomRepository(gateway: gateway, sessions: sessions),
        sessions: sessions,
        clock: clock,
        lifecycle: lifecycle,
      );
      await tester.runAsync(() async {
        await load();
        gateway.data(snapshotFixture(detailRoom: roomA));
        await c.openRoom(roomA);
      });
      final before = gateway.calls.length;
      gateway.respond = (_) => gateway.calls.length > before + 4
          ? const Failed(
              AppFailure(
                code: FailureCode.unavailable,
                message: 'test loop fence',
              ),
            )
          : Success(
              CloudReply(
                data: {
                  'error': {'code': 'forbidden'},
                },
                statusCode: 403,
              ),
            );
      c.setVisible(true);
      await tester.pump(const Duration(milliseconds: 1));
      await tester.pump(const Duration(milliseconds: 1));
      await tester.pump(const Duration(milliseconds: 1));
      expect(gateway.calls.length, before + 2);
      expect(gateway.calls[before].payload, {'room_id': roomA});
      expect(gateway.calls[before + 1].payload, isEmpty);
      expect(c.snapshot, isNull);
      expect(c.attempt, isNull);
      for (var i = 0; i < 3; i++) {
        lifecycle.setPhase(AppLifecyclePhase.background);
        lifecycle.setPhase(AppLifecyclePhase.foreground);
        await tester.pump(const Duration(minutes: 2));
        expect(gateway.calls.length, before + 2);
      }
      gateway.respond = (_) =>
          Success(CloudReply(data: snapshotFixture(user: teacherB)));
      sessions.bindUser(userId: teacherB, sessionId: 'teacher-b');
      await tester.pump(const Duration(milliseconds: 1));
      await tester.pump(const Duration(milliseconds: 1));
      expect(gateway.calls.length, before + 3);
      expect(c.snapshot!.profile.id, teacherB);
      c.setVisible(false);
    },
  );

  test('stale leave scope cannot clear a same-actor replacement attempt and pending event', () async {
    await studentRoom();
    gateway.data({'state': attemptFixture()});
    await c.startAttempt();
    final scope = c.captureScope();
    final replacement = attemptFixture(
      room: roomB,
      id: '50000000-0000-4000-8000-000000000002',
    );
    gateway.data(
      snapshotFixture(
        user: studentA,
        role: 'student',
        detailRoom: roomB,
        attempt: replacement,
      ),
    );
    expect(await c.openRoom(roomB), isTrue);
    gateway.data({'state': replacement});
    expect(await c.startAttempt(), isTrue);
    gateway.lost();
    await c.gameCommand('hint');
    final pending = c.pendingGame, before = gateway.calls.length;
    c.leaveGame(expectedScope: scope);
    expect(c.isScopeCurrent(scope), isFalse);
    expect(c.attempt!.id, replacement['attemptId']);
    expect(c.selectedRoomId, roomB);
    expect(c.pendingGame, same(pending));
    expect(gateway.calls.length, before);
  });
}
