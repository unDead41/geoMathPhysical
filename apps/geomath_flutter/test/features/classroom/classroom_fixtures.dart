import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';

const teacherA = '10000000-0000-4000-8000-000000000001';
const teacherB = '10000000-0000-4000-8000-000000000002';
const studentA = '20000000-0000-4000-8000-000000000001';
const studentB = '20000000-0000-4000-8000-000000000002';
const classA = '30000000-0000-4000-8000-000000000001';
const classB = '30000000-0000-4000-8000-000000000002';
const roomA = '40000000-0000-4000-8000-000000000001';
const roomB = '40000000-0000-4000-8000-000000000002';
const attemptA = '50000000-0000-4000-8000-000000000001';
const inviteA = '60000000-0000-4000-8000-000000000001';
const inviteB = '60000000-0000-4000-8000-000000000002';

/// Scripted protocol projections, deliberately independent of feature logic.
Map<String, Object?> attemptFixture({
  String room = roomA,
  String id = attemptA,
  String stage = 'solid',
  String status = 'running',
  int score = 0,
  int index = 0,
  int ready = 0,
  int elapsed = 1200,
  bool hint = false,
}) => {
  'attemptId': id,
  'roomId': room,
  'questions': ['P1', 'P2', 'P3', 'S1', 'S2', 'S3', 'K1', 'K2', 'K3', 'C1'],
  'index': index,
  'stage': stage,
  'status': status,
  'score': score,
  'mistakes': 0,
  'hints': hint ? 1 : 0,
  'skipped': 0,
  'elapsed': elapsed,
  'hintUsed': hint,
  'attempts': 0,
  'lastOutcome': status == 'feedback' ? 'correct' : null,
  'wrongReader': null,
  'answers': <Object?>[],
  'readyInMs': ready,
};

Map<String, Object?> snapshotFixture({
  String user = teacherA,
  String role = 'teacher',
  int revision = 3,
  String name = 'Kelas A',
  String status = 'open',
  bool archived = false,
  bool parentArchived = false,
  bool capability = true,
  String? detailRoom,
  Map<String, Object?>? attempt,
  String invitation = inviteA,
  bool removed = false,
  bool pin = true,
}) {
  final classes = <Map<String, Object?>>[
    for (final entry in [
      (classA, teacherA, name),
      (classB, teacherB, 'Kelas B'),
    ])
      if (!removed || entry.$1 != classA)
        {
          'id': entry.$1,
          'teacher_id': entry.$2,
          'name': entry.$3,
          'teacher_name': 'Guru',
          'revision': revision,
          'archived_at': parentArchived && entry.$1 == classA
              ? '2026-11-05T00:00:00Z'
              : null,
          'pin': pin && entry.$1 == classA ? '001234' : null,
          'pin_expires_at': pin && entry.$1 == classA
              ? '2026-11-06T00:00:00Z'
              : null,
          'members': [
            {
              'id': studentA,
              'username': 'murid_a',
              'display_name': 'Murid A',
              'last_seen': '2026-11-05T00:00:00Z',
            },
            {
              'id': studentB,
              'username': 'murid_b',
              'display_name': 'Murid B',
              'last_seen': null,
            },
          ],
          'pending_invites': entry.$1 == classA
              ? [
                  {
                    'id': invitation,
                    'username': 'murid_b',
                    'display_name': 'Murid B',
                  },
                ]
              : <Object?>[],
        },
  ];
  final rooms = <Map<String, Object?>>[
    for (final entry in [(roomA, classA, teacherA), (roomB, classB, teacherB)])
      if (!removed || entry.$1 != roomA)
        {
          'id': entry.$1,
          'class_id': entry.$2,
          'teacher_id': entry.$3,
          'name': entry.$1 == roomA ? 'Bilik A' : 'Bilik B',
          'class_name': 'Kelas',
          'status': entry.$1 == roomA ? status : 'open',
          'revision': revision,
          'archived_at': archived && entry.$1 == roomA
              ? '2026-11-05T00:00:00Z'
              : null,
          'class_archived_at': parentArchived && entry.$1 == roomA
              ? '2026-11-05T00:00:00Z'
              : null,
          'pin': null,
          'pin_expires_at': null,
          'is_member': true,
          'members_count': 2,
        },
  ];
  return {
    if (capability) 'classroom_crud': 1,
    'profile': {
      'id': user,
      'display_name': role == 'teacher' ? 'Guru A' : 'Murid A',
      'role': role,
    },
    'classes': classes,
    'rooms': rooms,
    'invites': role == 'student'
        ? [
            {
              'id': invitation,
              'class_id': classA,
              'class_name': 'Kelas A',
              'teacher_name': 'Guru A',
            },
          ]
        : <Object?>[],
    'server_now': '2026-11-05T00:00:00Z',
    if (detailRoom != null && rooms.any((r) => r['id'] == detailRoom))
      'room': {
        ...Map<String, Object?>.from(
          rooms.singleWhere((r) => r['id'] == detailRoom),
        )..remove('teacher_id'),
        'players': [
          {
            'user_id': studentA,
            'display_name': 'Murid A',
            'status': 'waiting',
            'score': 0,
            'elapsed_ms': 0,
            'question_index': 0,
            'last_seen': null,
          },
          {
            'user_id': studentB,
            'display_name': 'Murid B',
            'status': 'finished',
            'score': 7,
            'elapsed_ms': 78000,
            'question_index': 9,
            'last_seen': '2026-11-05T00:00:00Z',
          },
        ],
        'my_attempt': attempt,
      },
  };
}

final class ClassroomTestClock implements Clock {
  int milliseconds = 0;
  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 5).add(Duration(milliseconds: milliseconds));
  @override
  int monotonicMilliseconds() => milliseconds;
}

final class ClassroomTestRandom implements RandomSource {
  int _value = 0;
  @override
  int nextInt(int maximum) => _value++ % maximum;
  @override
  double nextDouble() => 0.5;
}

final class ClassroomRequest {
  ClassroomRequest(this.name, this.parameters, this.actor);
  final String name;
  final Map<String, Object?> parameters;
  final ActorBinding actor;
  String get action => parameters['action'] as String;
  Map<String, Object?> get payload =>
      Map<String, Object?>.from(parameters['payload'] as Map);
}

final class ClassroomFixtureGateway implements CloudGateway {
  ClassroomFixtureGateway(this.sessions, {this.configured = true});
  @override
  final AuthSession sessions;
  @override
  bool configured;
  final calls = <ClassroomRequest>[];
  final replies = Queue<FutureOr<Result<CloudReply>>>();
  FutureOr<Result<CloudReply>> Function(ClassroomRequest)? respond;
  void data(Map<String, Object?> value, {int status = 200}) =>
      replies.add(Success(CloudReply(data: value, statusCode: status)));
  void error(String code) => data({
    'error': {'code': code, 'message': 'untrusted server message'},
  });
  void lost() => replies.add(
    const Failed(AppFailure(code: FailureCode.network, message: 'opaque')),
  );
  @override
  Future<Result<CloudReply>> rpc({
    required String name,
    required Map<String, Object?> parameters,
    required ActorBinding actor,
  }) async {
    final copy = Map<String, Object?>.from(
      jsonDecode(jsonEncode(parameters)) as Map,
    );
    final request = ClassroomRequest(name, copy, actor);
    calls.add(request);
    if (replies.isNotEmpty) return await replies.removeFirst();
    if (respond != null) return await respond!(request);
    throw StateError('Unscripted fixture action ${request.action}');
  }
}

final class ClassroomFileAssets extends CachingAssetBundle {
  ClassroomFileAssets({this.corrupt = false, this.missing = false});
  final bool corrupt, missing;
  @override
  Future<ByteData> load(String key) async {
    if (missing) throw StateError('missing asset');
    final bytes = await File(key).readAsBytes();
    if (corrupt && key.endsWith('bank15.json')) bytes[100] ^= 1;
    return ByteData.sublistView(bytes);
  }
}
