import '../../../core/result.dart';

typedef ClassroomJson = Map<String, Object?>;

/// Trusted projections are parsed at the boundary; no local score computation.
final class ClassroomSnapshot {
  ClassroomSnapshot._({
    required this.profile,
    required this.classes,
    required this.rooms,
    required this.invites,
    required this.crudAvailable,
    required this.serverNow,
    this.room,
  });

  final ClassroomProfile profile;
  final List<ClassroomClass> classes;
  final List<ClassroomRoom> rooms;
  final List<ClassroomInvite> invites;
  final bool crudAvailable;
  final DateTime serverNow;
  final ClassroomRoom? room;

  static Result<ClassroomSnapshot> parse(ClassroomJson json) {
    try {
      final profile = ClassroomProfile._from(_map(json['profile']));
      final classes = _rows(json['classes']).map(ClassroomClass._from).toList();
      final rooms = _rows(json['rooms']).map(ClassroomRoom._from).toList();
      final detail = json['room'];
      ClassroomRoom? room;
      if (detail != null) {
        final value = _map(detail);
        final id = _id(value['id']);
        final summaries = rooms.where((r) => r.id == id);
        room = ClassroomRoom._from({
          if (summaries.isNotEmpty) ...summaries.first.source,
          ...value,
        });
      }
      return Success(
        ClassroomSnapshot._(
          profile: profile,
          classes: List.unmodifiable(classes),
          rooms: List.unmodifiable(rooms),
          room: room,
          invites: List.unmodifiable(
            _rows(json['invites']).map(ClassroomInvite._from),
          ),
          crudAvailable: json['classroom_crud'] == 1,
          serverNow: _date(json['server_now'])!,
        ),
      );
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'classroom.error.invalid_response',
        ),
      );
    }
  }

  bool ownsClass(String id) =>
      profile.isTeacher &&
      classes.any((item) => item.id == id && item.teacherId == profile.id);
  bool ownsRoom(String id) =>
      profile.isTeacher &&
      rooms.any(
        (item) =>
            item.id == id &&
            ownsClass(item.classId) &&
            item.teacherId == profile.id,
      );
}

final class ClassroomProfile {
  ClassroomProfile._from(ClassroomJson json)
    : id = _id(json['id']),
      name = _text(json['display_name']),
      role = _oneOf(json['role'], const {'teacher', 'student'});
  final String id, name, role;
  bool get isTeacher => role == 'teacher';
}

final class ClassroomClass {
  ClassroomClass._from(ClassroomJson json)
    : id = _id(json['id']),
      name = _text(json['name']),
      teacherId = _id(json['teacher_id']),
      revision = _integer(json['revision'] ?? 0),
      archivedAt = _date(json['archived_at'], optional: true),
      pin = _pin(json['pin']),
      pinExpiresAt = _date(json['pin_expires_at'], optional: true),
      teacherName = _text(json['teacher_name'] ?? ''),
      members = List.unmodifiable(
        _rows(json['members']).map(ClassroomMember._from),
      ),
      invites = List.unmodifiable(
        _rows(json['pending_invites']).map(
          (value) => ClassroomInvite._from({...value, 'class_id': json['id']}),
        ),
      );
  final String id, name, teacherId, teacherName;
  final int revision;
  final DateTime? archivedAt, pinExpiresAt;
  final String? pin;
  final List<ClassroomMember> members;
  final List<ClassroomInvite> invites;
  bool get archived => archivedAt != null;
  String? activePin(DateTime serverTime) =>
      !archived && pinExpiresAt?.isAfter(serverTime) == true ? pin : null;
}

final class ClassroomMember {
  ClassroomMember._from(ClassroomJson json)
    : id = _id(json['id']),
      name = _text(json['display_name']),
      username = _text(json['username']),
      lastSeen = _date(json['last_seen'], optional: true);
  final String id, name, username;
  final DateTime? lastSeen;
}

final class ClassroomInvite {
  ClassroomInvite._from(ClassroomJson json)
    : id = _id(json['id']),
      classId = _id(json['class_id']),
      className = _text(json['class_name'] ?? ''),
      teacherName = _text(json['teacher_name'] ?? ''),
      username = _text(json['username'] ?? ''),
      name = _text(json['display_name'] ?? '');
  final String id, classId, className, teacherName, username, name;
}

final class ClassroomRoom {
  ClassroomRoom._from(ClassroomJson json)
    : source = Map.unmodifiable(json),
      id = _id(json['id']),
      classId = _id(json['class_id']),
      name = _text(json['name']),
      className = _text(json['class_name'] ?? ''),
      teacherId = json['teacher_id'] == null ? '' : _id(json['teacher_id']),
      status = _oneOf(json['status'], const {'open', 'playing', 'closed'}),
      revision = _integer(json['revision'] ?? 0),
      archivedAt = _date(json['archived_at'], optional: true),
      classArchivedAt = _date(json['class_archived_at'], optional: true),
      pin = _pin(json['pin']),
      pinExpiresAt = _date(json['pin_expires_at'], optional: true),
      isMember = json['is_member'] == true,
      membersCount = _integer(json['members_count'] ?? 0),
      players = List.unmodifiable(
        _rows(json['players']).map(ClassroomPlayer._from),
      ),
      myAttempt = json['my_attempt'] == null
          ? null
          : ClassroomAttempt.fromJson(_map(json['my_attempt']));
  final ClassroomJson source;
  final String id, classId, name, className, teacherId, status;
  final int revision, membersCount;
  final DateTime? archivedAt, classArchivedAt, pinExpiresAt;
  final String? pin;
  final bool isMember;
  final List<ClassroomPlayer> players;
  final ClassroomAttempt? myAttempt;
  bool get archived => archivedAt != null || classArchivedAt != null;
  bool get closed => status == 'closed';
  String? activePin(DateTime serverTime) =>
      !archived && !closed && pinExpiresAt?.isAfter(serverTime) == true
      ? pin
      : null;
}

final class ClassroomPlayer {
  ClassroomPlayer._from(ClassroomJson json)
    : userId = _id(json['user_id']),
      name = _text(json['display_name']),
      status = _oneOf(json['status'], const {
        'waiting',
        'playing',
        'review',
        'finished',
        'closed',
      }),
      score = _integer(json['score'], max: 10),
      elapsed = _integer(json['elapsed_ms']),
      timerStartedAt = _date(json['timer_started_at'], optional: true),
      index = _integer(json['question_index'], max: 9),
      lastSeen = _date(json['last_seen'], optional: true);
  final String userId, name, status;
  final int score, elapsed, index;
  final DateTime? lastSeen, timerStartedAt;
  bool get waiting => status == 'waiting';
  int displayedElapsed(DateTime serverTime) =>
      elapsed +
      (status == 'playing' && timerStartedAt != null
          ? serverTime
                .difference(timerStartedAt!)
                .inMilliseconds
                .clamp(0, 1 << 53)
          : 0);
}

final class ClassroomAttempt {
  ClassroomAttempt.fromJson(ClassroomJson json)
    : id = _id(json['attemptId']),
      roomId = _id(json['roomId']),
      questions = _questions(json['questions']),
      index = _integer(json['index'], max: 9),
      stage = _oneOf(json['stage'], const {'solid', 'net'}),
      status = _oneOf(json['status'], const {
        'running',
        'review',
        'feedback',
        'finished',
        'closed',
      }),
      score = _integer(json['score'], max: 10),
      elapsed = _integer(json['elapsed']),
      readyInMs = _integer(json['readyInMs']),
      hints = _integer(json['hints'], max: 10),
      hintUsed = json['hintUsed'] == true,
      lastOutcome = json['lastOutcome'] == null
          ? null
          : _oneOf(json['lastOutcome'], const {'wrong', 'correct', 'skipped'}),
      answers = List.unmodifiable(
        _rows(json['answers']).map(Map<String, Object?>.unmodifiable),
      );
  final String id, roomId, stage, status;
  final List<String> questions;
  final int index, score, elapsed, readyInMs, hints;
  final bool hintUsed;
  final String? lastOutcome;
  final List<ClassroomJson> answers;
  bool get terminal => status == 'finished' || status == 'closed';
  String get questionId => questions[index];
}

abstract final class ClassroomValidation {
  static bool name(String value) {
    final text = value.trim();
    return text.runes.length >= 2 &&
        text.runes.length <= 60 &&
        !RegExp(r'[\u0000-\u001f\u007f-\u009f]').hasMatch(text);
  }

  static bool pin(String value) => RegExp(r'^[0-9]{6}$').hasMatch(value);
  static bool uuid(String value) => RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  ).hasMatch(value);
}

ClassroomJson _map(Object? value) {
  if (value is! Map || value.keys.any((key) => key is! String)) {
    throw const FormatException();
  }
  return Map<String, Object?>.from(value);
}

List<ClassroomJson> _rows(Object? value) {
  if (value == null) return const [];
  if (value is! List) throw const FormatException();
  return value.map(_map).toList();
}

String _text(Object? value) {
  if (value is! String || value.length > 8192) throw const FormatException();
  return value;
}

String _id(Object? value) {
  final id = _text(value);
  if (!ClassroomValidation.uuid(id)) throw const FormatException();
  return id;
}

String _oneOf(Object? value, Set<String> allowed) {
  final text = _text(value);
  if (!allowed.contains(text)) throw const FormatException();
  return text;
}

int _integer(Object? value, {int? max}) {
  if (value is! int || value < 0 || max != null && value > max) {
    throw const FormatException();
  }
  return value;
}

DateTime? _date(Object? value, {bool optional = false}) {
  if (value == null && optional) return null;
  final date = DateTime.tryParse(_text(value));
  if (date == null) throw const FormatException();
  return date.toUtc();
}

String? _pin(Object? value) {
  if (value == null) return null;
  final pin = _text(value);
  if (!ClassroomValidation.pin(pin)) throw const FormatException();
  return pin;
}

List<String> _questions(Object? value) {
  if (value is! List || value.length != 10 || value.toSet().length != 10) {
    throw const FormatException();
  }
  return List.unmodifiable(value.map(_text));
}
