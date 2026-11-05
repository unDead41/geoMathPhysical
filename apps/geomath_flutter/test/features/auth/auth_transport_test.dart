import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/features/auth/data/auth_transport.dart';

class TrackedRequest implements HttpClientRequest {
  TrackedRequest(this.inner);
  final HttpClientRequest inner;
  bool aborted = false;
  @override
  HttpHeaders get headers => inner.headers;
  @override
  set followRedirects(bool value) => inner.followRedirects = value;
  @override
  void write(Object? value) => inner.write(value);
  @override
  Future<HttpClientResponse> close() => inner.close();
  @override
  void abort([Object? exception, StackTrace? stackTrace]) {
    aborted = true;
    inner.abort(exception, stackTrace);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class TrackedClient implements HttpClient {
  final HttpClient inner = HttpClient();
  TrackedRequest? request;
  @override
  set connectionTimeout(Duration? value) => inner.connectionTimeout = value;
  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async =>
      request = TrackedRequest(await inner.openUrl(method, url));
  @override
  void close({bool force = false}) => inner.close(force: force);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  for (final status in [429, 500, 502, 503, 504, 404, 405, 501]) {
    test(
      'loopback non-JSON HTTP$status preserves status and Retry-After',
      () async {
        final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
        final subscription = server.listen((request) async {
          request.response
            ..statusCode = status
            ..headers.contentType = ContentType.html
            ..headers.set(HttpHeaders.retryAfterHeader, '37')
            ..write('<html><body>upstream error SECRET</body></html>');
          await request.response.close();
        });
        final transport = NativeAuthTransport();
        try {
          final response = await transport.send(
            AuthRequest(
              uri: Uri.parse('http://127.0.0.1:${server.port}/gateway'),
              method: 'GET',
              headers: const {},
            ),
          );
          expect(response.statusCode, status);
          expect(response.retryAfter, '37');
          expect(response.data, isEmpty);
        } finally {
          transport.close();
          await server.close(force: true);
          await subscription.cancel();
        }
      },
    );
  }
  test('loopback HTTP200 still rejects a non-JSON success body', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final subscription = server.listen((request) async {
      request.response
        ..statusCode = 200
        ..headers.contentType = ContentType.html
        ..write('<html>not an account response</html>');
      await request.response.close();
    });
    final transport = NativeAuthTransport();
    try {
      await expectLater(
        transport.send(
          AuthRequest(
            uri: Uri.parse('http://127.0.0.1:${server.port}/gateway'),
            method: 'GET',
            headers: const {},
          ),
        ),
        throwsFormatException,
      );
    } finally {
      transport.close();
      await server.close(force: true);
      await subscription.cancel();
    }
  });
  test(
    'whole-attempt deadline aborts a body that keeps trickling bytes',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final finished = Completer<void>();
      var chunks = 0;
      final subscription = server.listen((request) async {
        try {
          request.response.bufferOutput = false;
          request.response.headers.contentType = ContentType.json;
          request.response.write('{"text":"');
          await request.response.flush();
          for (var i = 0; i < 100; i++) {
            request.response.write('x');
            await request.response.flush();
            ++chunks;
            await Future<void>.delayed(const Duration(milliseconds: 10));
          }
          request.response.write('"}');
        } catch (_) {
          /* Client abort is expected. */
        } finally {
          try {
            await request.response.close();
          } catch (_) {
            /* Aborted socket. */
          }
          if (!finished.isCompleted) finished.complete();
        }
      });
      final client = TrackedClient();
      final transport = NativeAuthTransport(
        deadline: const Duration(milliseconds: 350),
        client: client,
      );
      try {
        await expectLater(
          transport.send(
            AuthRequest(
              uri: Uri.parse('http://127.0.0.1:${server.port}/trickle'),
              method: 'GET',
              headers: const {},
            ),
          ),
          throwsA(isA<TimeoutException>()),
        );
        expect(chunks, greaterThan(1));
        expect(client.request?.aborted, isTrue);
      } finally {
        transport.close();
        await server.close(force: true);
        await subscription.cancel();
        await finished.future.timeout(const Duration(seconds: 3));
      }
    },
  );
}
