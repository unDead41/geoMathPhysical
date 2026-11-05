import '../result.dart';
import '../session/actor_binding.dart';
import '../storage/app_database.dart';
import 'formative_record.dart';

enum FormativeSaveState { local, pending }

/// Returned only after commit acknowledgment, and bound to the original actor.
/// Pending is durable local data awaiting server acceptance, never "synced".
final class DurableRecordReceipt {
  const DurableRecordReceipt({
    required this.actor,
    required this.recordId,
    required this.persistedAt,
    required this.state,
  });

  final ActorBinding actor;
  final String recordId;
  final DateTime persistedAt;
  final FormativeSaveState state;
  bool get durable => true;
}

abstract interface class FormativeRecordWriter {
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  });
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  });
}

abstract interface class FormativeRecordReader {
  Stream<Result<List<ModuleReflection>>> watchReflections(ActorBinding actor);
  Future<Result<List<CompletedSoloRecord>>> readCompletedSolo(
    ActorBinding actor,
  );
}

enum FormativeEventKind { module, solo }

/// Canonical, credential-free immutable event. Owner is supplied by native auth,
/// removed from outbound requests, and established again by the server.
final class FormativeEvent {
  factory FormativeEvent({
    required String id,
    required FormativeEventKind kind,
    required Map<String, Object?> payload,
  }) {
    if (!isFormativeEventId(id)) {
      throw ArgumentError('Invalid formative event ID.');
    }
    final canonical = switch (kind) {
      FormativeEventKind.module => ModuleReflection.fromJson(
        payload,
      ).valueOrNull?.toJson(),
      FormativeEventKind.solo => CompletedSoloRecord.fromJson(
        payload,
      ).valueOrNull?.toJson(),
    };
    if (canonical == null) {
      throw ArgumentError('Invalid formative event content.');
    }
    final allowed = switch (kind) {
      FormativeEventKind.module => const {
        'activity',
        'stage',
        'prediction',
        'result',
        'explanation',
        'completed',
      },
      FormativeEventKind.solo => const {
        'attempt_id',
        'mode',
        'ruleset',
        'score',
        'total',
        'mistakes',
        'hints',
        'skipped',
        'elapsed_ms',
      },
    };
    if (payload.keys.any((key) => !allowed.contains(key))) {
      throw ArgumentError('Unexpected formative event field.');
    }
    return FormativeEvent._(id, kind, Map.unmodifiable(canonical));
  }

  const FormativeEvent._(this.id, this.kind, this.payload);

  final String id;
  final FormativeEventKind kind;
  final Map<String, Object?> payload;
  int get contentVersion => 1;

  Map<String, Object?> toWireJson() => {
    'id': id,
    'kind': kind.name,
    'content_version': contentVersion,
    'payload': payload,
  };
}

/// Prompt 3's signed-in queue adapter appends in this exact transaction.
/// Failure rolls back BOTH the record and the event. Never send from this hook.
abstract interface class FormativeOutboxAppender {
  Future<Result<void>> append({
    required AppTransaction transaction,
    required ActorBinding actor,
    required FormativeEvent event,
  });
}
