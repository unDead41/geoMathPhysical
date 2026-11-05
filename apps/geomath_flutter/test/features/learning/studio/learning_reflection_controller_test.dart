import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_reflection_controller.dart';

void main() {
  late SessionController sessions;
  late _Reader reader;
  late _Writer writer;
  late LearningReflectionController controller;
  setUp(() {
    sessions = SessionController.guest(
      guestId: 'guest',
      sessionId: 'guest-session',
    );
    reader = _Reader();
    writer = _Writer();
    controller = LearningReflectionController(
      reader: reader,
      writer: writer,
      sessions: sessions,
    );
  });
  tearDown(() async {
    controller.dispose();
    await sessions.dispose();
    await reader.close();
  });

  test('records come only from the actor-bound shared reader and clear synchronously on switch', () async {
    final guest = sessions.current;
    final earned = reflection();
    reader.send(guest, Success([earned]));
    expect(controller.records, [earned]);
    sessions.bindUser(userId: 'A', sessionId: 'a');
    expect(controller.records, isEmpty);
    expect(controller.lastReceipt, isNull);
    reader.send(guest, Success([earned]));
    expect(controller.records, isEmpty);
    final a = sessions.current;
    reader.send(a, Success([reflection(activity: ModuleActivity.area)]));
    expect(controller.records.single.activity, ModuleActivity.area);
    sessions.logout();
    expect(controller.records, isEmpty);
    reader.send(sessions.current, Success([earned]));
    expect(controller.records, [earned]);
  });

  test('failed save keeps the canonical DTO for retry and never manufactures a receipt or record', () async {
    final actor = sessions.current;
    var attempts = 0;
    writer.onSave = (actor, record) async => ++attempts == 1
        ? const Failed(storageFailure)
        : Success(receipt(actor, record));
    final earned = reflection();
    final failed = await controller.save(earned);
    expect(failed.failureOrNull?.code, FailureCode.storage);
    expect(controller.failedReflections, [earned]);
    expect(controller.lastReceipt, isNull);
    expect(controller.records, isEmpty);
    expect(controller.saving, isFalse);
    await controller.retryFailed();
    expect(attempts, 2);
    expect(controller.saveFailure, isNull);
    expect(controller.failedReflections, isEmpty);
    expect(controller.lastReceipt?.actor, actor);
    expect(controller.lastReceipt?.durable, isTrue);
    // Writer receipt and record read are separate acknowledgements.
    expect(controller.records, isEmpty);
    reader.send(actor, Success([earned]));
    expect(controller.records, [earned]);
  });

  test('late A receipt cannot replace B status or block B save', () async {
    sessions.bindUser(userId: 'A', sessionId: 'a');
    final actorA = sessions.current;
    final delayedA = Completer<Result<DurableRecordReceipt>>();
    writer.onSave = (actor, value) async =>
        actor == actorA ? delayedA.future : Success(receipt(actor, value));
    final aSave = controller.save(reflection(), actor: actorA);
    await Future<void>.delayed(Duration.zero);
    sessions.bindUser(userId: 'B', sessionId: 'b');
    final actorB = sessions.current;
    final bSave = await controller.save(
      reflection(activity: ModuleActivity.area),
      actor: actorB,
    );
    expect(bSave.valueOrNull?.actor, actorB);
    delayedA.complete(Success(receipt(actorA, reflection())));
    expect((await aSave).failureOrNull?.code, FailureCode.stale);
    expect(controller.lastReceipt?.actor, actorB);
    expect(controller.saveFailure, isNull);
    expect(controller.saving, isFalse);
  });

  test('read retry invalidates the old subscription without invalidating a save in flight', () async {
    final actor = sessions.current;
    final saved = Completer<Result<DurableRecordReceipt>>();
    writer.onSave = (_, _) => saved.future;
    final pending = controller.save(reflection());
    await Future<void>.delayed(Duration.zero);
    reader.send(actor, const Failed(storageFailure));
    expect(controller.readFailure, storageFailure);
    controller.retryRead();
    reader.send(actor, const Success([]));
    saved.complete(Success(receipt(actor, reflection())));
    expect((await pending).isSuccess, isTrue);
    expect(controller.readFailure, isNull);
    expect(controller.saving, isFalse);
    expect(controller.lastReceipt, isNotNull);
  });

  test('failures in different activities are retained and retried without silent replacement', () async {
    writer.onSave = (_, _) async => const Failed(storageFailure);
    await controller.save(reflection(activity: ModuleActivity.net));
    await controller.save(reflection(activity: ModuleActivity.volume));
    expect(controller.failedReflections.map((r) => r.activity), [
      ModuleActivity.net,
      ModuleActivity.volume,
    ]);
    writer.onSave = (actor, record) async => Success(receipt(actor, record));
    await controller.retryFailed();
    expect(controller.failedReflections, isEmpty);
    expect(writer.saved.length, 4);
  });

  test('wrong-actor receipts and stale caller bindings never become saved UI state', () async {
    final old = sessions.current;
    sessions.bindUser(userId: 'B', sessionId: 'b');
    expect(
      (await controller.save(reflection(), actor: old)).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(writer.saved, isEmpty);
    writer.onSave = (_, record) async => Success(receipt(old, record));
    expect(
      (await controller.save(reflection())).failureOrNull?.code,
      FailureCode.stale,
    );
    expect(controller.lastReceipt, isNull);
    expect(controller.failedReflections.length, 1);
  });

  test('queued saves of one activity leave only the latest failed DTO available for retry', () async {
    final first = Completer<Result<DurableRecordReceipt>>();
    var attempts = 0;
    writer.onSave = (actor, value) => ++attempts == 1
        ? first.future
        : Future.value(const Failed(storageFailure));
    final old = controller.save(reflection());
    final revised = reflection(
      explanation: 'A revised explanation using the actual experiment.',
    );
    final next = controller.save(revised);
    await Future<void>.delayed(Duration.zero);
    first.complete(const Failed(storageFailure));
    await old;
    await next;
    expect(controller.failedReflections, [revised]);
    expect(controller.saving, isFalse);
  });
}

ModuleReflection reflection({
  ModuleActivity activity = ModuleActivity.net,
  String explanation = 'Six distinct faces close without overlap.',
}) => ModuleReflection.create(
  activity: activity,
  stage: ReflectionStage.explanation,
  prediction: 'It will close.',
  result: 'The experiment closed.',
  explanation: explanation,
  completed: true,
).valueOrNull!;

DurableRecordReceipt receipt(ActorBinding actor, ModuleReflection reflection) =>
    DurableRecordReceipt(
      actor: actor,
      recordId: reflection.activity.name,
      persistedAt: DateTime.utc(2026, 11, 5),
      state: actor.isGuest
          ? FormativeSaveState.local
          : FormativeSaveState.pending,
    );

const storageFailure = AppFailure(
  code: FailureCode.storage,
  message: 'Storage denied in this port fixture.',
);

class _Reader implements FormativeRecordReader {
  final Map<ActorBinding, StreamController<Result<List<ModuleReflection>>>>
  streams = {};
  StreamController<Result<List<ModuleReflection>>> stream(ActorBinding actor) =>
      streams.putIfAbsent(actor, () => StreamController.broadcast(sync: true));
  void send(ActorBinding actor, Result<List<ModuleReflection>> value) =>
      stream(actor).add(value);
  Future<void> close() async {
    for (final value in streams.values) {
      await value.close();
    }
  }

  @override
  Stream<Result<List<ModuleReflection>>> watchReflections(ActorBinding actor) =>
      stream(actor).stream;
  @override
  Future<Result<List<CompletedSoloRecord>>> readCompletedSolo(
    ActorBinding actor,
  ) async => const Success([]);
}

class _Writer implements FormativeRecordWriter {
  Future<Result<DurableRecordReceipt>> Function(ActorBinding, ModuleReflection)?
  onSave;
  final List<ModuleReflection> saved = [];
  @override
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  }) async {
    saved.add(reflection);
    return await onSave?.call(actor, reflection) ??
        Success(receipt(actor, reflection));
  }

  @override
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) async => throw UnsupportedError(
    'The learning controller never saves solo results.',
  );
}
