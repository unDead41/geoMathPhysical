import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/features/duel/duel_transport.dart';

final class _Headers extends Fake implements HttpHeaders {
  final values = <String, String>{};
  @override
  ContentType? contentType;
  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {
    values[name] = value.toString();
  }

  @override
  void forEach(void Function(String, List<String>) action) {
    values.forEach((name, value) => action(name, [value]));
  }
}

final class _Response extends Stream<List<int>> implements HttpClientResponse {
  _Response(this.data) : statusCode = 200;
  final List<int> data;
  @override
  final int statusCode;
  @override
  final headers = _Headers()..values['X-GeoDecoder-Duel-Protocol'] = '2';
  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) => Stream<List<int>>.value(data).listen(
    onData,
    onError: onError,
    onDone: onDone,
    cancelOnError: cancelOnError,
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _Request extends Fake implements HttpClientRequest {
  final bytes = <int>[];
  @override
  final _Headers headers = _Headers();
  @override
  bool followRedirects = true;
  @override
  int contentLength = -1;
  bool aborted = false;
  Future<HttpClientResponse>? response;
  @override
  void add(List<int> data) => bytes.addAll(data);
  @override
  void abort([Object? exception, StackTrace? stackTrace]) {
    aborted = true;
  }

  @override
  Future<HttpClientResponse> close() =>
      response ?? Future.value(_Response(utf8.encode('{"ok":true}')));
}

final class _Client extends Fake implements HttpClient {
  @override
  Duration? connectionTimeout;
  final request = _Request();
  Completer<HttpClientRequest>? opening;
  Uri? requestedUri;
  bool closed = false;
  @override
  Future<HttpClientRequest> postUrl(Uri url) async {
    requestedUri = url;
    return opening?.future ?? request;
  }

  @override
  void close({bool force = false}) {
    closed = force;
  }
}

PublicBackendConnection _connection([String scheme = 'https']) =>
    PublicBackendConnection(
      url: Uri.parse('$scheme://example.invalid'),
      publishableKey: 'public-key',
      redirectUri: Uri.parse('com.geomath.dev://auth/callback'),
    );

// Synthetic public-key envelopes only; deliberately not valid signed JWTs.
String _fixtureKey(Map<String, Object?> claims) =>
    '${base64Url.encode(utf8.encode('{"alg":"HS256","typ":"JWT"}')).replaceAll('=', '')}.'
    '${base64Url.encode(utf8.encode(jsonEncode(claims))).replaceAll('=', '')}.fixture-signature';

PublicBackendConnection _withKey(String key) => PublicBackendConnection(
  url: _connection().url,
  publishableKey: key,
  redirectUri: _connection().redirectUri,
);

void main() {
  test('IO adapter uses HTTPS, public apikey, no auth/cookie and bounded JSON response', () async {
    final client = _Client();
    final transport = IoDuelTransport(_connection(), client: client);
    final payload = <String, Object?>{
      'protocol': 2,
      'action': 'state',
      'token': 'private-capability',
    };
    final response = await transport.post(payload);
    expect(
      client.requestedUri.toString(),
      'https://example.invalid/functions/v1/geodecoder-duel',
    );
    expect(client.request.headers.values, {
      'apikey': 'public-key',
      'cache-control': 'no-store',
    });
    expect(client.request.headers.contentType, ContentType.json);
    expect(client.request.followRedirects, isFalse);
    expect(jsonDecode(utf8.decode(client.request.bytes)), payload);
    expect(response.header('x-geodecoder-duel-protocol'), '2');
    transport.close();
    expect(client.closed, isTrue);
    expect(() => IoDuelTransport(_connection('http')), throwsArgumentError);
  });
  test(
    'legacy public anon header reaches verified Edge without a user session',
    () async {
      final key = _fixtureKey({'role': 'anon', 'ref': 'example'});
      final client = _Client();
      final transport = IoDuelTransport(_withKey(key), client: client);
      final command = <String, Object?>{
        'protocol': 2,
        'action': 'state',
        'token': 'independent-room-capability',
      };
      await transport.post(command);
      expect(client.request.headers.values['apikey'], key);
      expect(
        client.request.headers.values[HttpHeaders.authorizationHeader],
        'Bearer $key',
      );
      expect(jsonDecode(utf8.decode(client.request.bytes)), command);
      expect(client.request.headers.values.containsKey('cookie'), isFalse);
      transport.close();
    },
  );
  test(
    'modern keys and non-anon identities never become guest Authorization',
    () async {
      for (final key in [
        'sb_publishable_fixture_public_key',
        _fixtureKey({'role': 'authenticated', 'sub': 'another-user'}),
        _fixtureKey({'role': 'service_role'}),
        _fixtureKey({'role': 'anon', 'session_id': 'a-user-session'}),
        _fixtureKey({'role': 'anon', 'sub': 'a-user'}),
        'broken.jwt.value',
      ]) {
        final client = _Client();
        final transport = IoDuelTransport(_withKey(key), client: client);
        await transport.post({'protocol': 2, 'action': 'state'});
        expect(
          client.request.headers.values.containsKey(
            HttpHeaders.authorizationHeader,
          ),
          isFalse,
        );
        transport.close();
      }
    },
  );
  test(
    'cancelling while postUrl is opening aborts before any capability is sent',
    () async {
      final client = _Client()..opening = Completer<HttpClientRequest>();
      final transport = IoDuelTransport(_connection(), client: client);
      final request = transport.post({
        'protocol': 2,
        'token': 'private-capability',
      });
      final assertion = expectLater(request, throwsA(isA<HttpException>()));
      transport.cancelPending();
      client.opening!.complete(client.request);
      await assertion;
      expect(client.request.aborted, isTrue);
      expect(client.request.bytes, isEmpty);
      transport.close();
    },
  );
  test(
    'timeout also aborts a later postUrl completion before writing secrets',
    () async {
      final client = _Client()..opening = Completer<HttpClientRequest>();
      final transport = IoDuelTransport(
        _connection(),
        client: client,
        timeout: const Duration(milliseconds: 5),
      );
      await expectLater(
        transport.post({'token': 'private-capability'}),
        throwsA(isA<TimeoutException>()),
      );
      client.opening!.complete(client.request);
      await Future<void>.delayed(Duration.zero);
      expect(client.request.aborted, isTrue);
      expect(client.request.bytes, isEmpty);
      transport.close();
    },
  );
  test(
    'oversized response is aborted and redirects are never followed',
    () async {
      final client = _Client();
      client.request.response = Future.value(
        _Response(List.filled(262145, 32)),
      );
      final transport = IoDuelTransport(_connection(), client: client);
      await expectLater(transport.post({'protocol': 2}), throwsFormatException);
      expect(client.request.aborted, isTrue);
      transport.close();
    },
  );
}
