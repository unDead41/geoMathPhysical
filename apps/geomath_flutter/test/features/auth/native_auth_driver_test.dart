import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_driver.dart';

void main() {
  test('pinned SDK creates S256 verifier and exchanges PKCE against local HTTP fixture', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final requests = <Map<String, Object?>>[];
    final stored = <String, String>{};
    final storage = ProtectedPkceStorage(
      read: (key) async => stored[key],
      write: (key, value) async {
        stored[key] = value;
      },
      remove: (key) async {
        stored.remove(key);
      },
    );
    final subscription = server.listen((request) async {
      final body = jsonDecode(
        await utf8.decoder.bind(request).join(),
      ) as Map<String, dynamic>;
      requests.add({
        'path': request.uri.path,
        'query': request.uri.queryParameters,
        'body': body,
        'apikey': request.headers.value('apikey'),
      });
      request.response.headers.contentType = ContentType.json;
      if (request.uri.path.endsWith('/recover')) {
        request.response.write('{}');
      } else {
        request.response.write(
          jsonEncode({
            'access_token': 'opaque-fixture-token',
            'refresh_token': 'opaque-fixture-refresh',
            'expires_in': 3600,
            'token_type': 'bearer',
            'user': {
              'id': 'fixture-user',
              'app_metadata': <String, Object?>{},
              'user_metadata': <String, Object?>{},
              'aud': 'authenticated',
              'created_at': '2026-11-05T00:00:00Z',
            },
          }),
        );
      }
      await request.response.close();
    });
    try {
      final configuration = PublicBackendConnection(
        url: Uri.parse('http://127.0.0.1:${server.port}'),
        publishableKey: 'public-fixture-key',
        redirectUri: Uri.parse('com.geomath.dev://auth/callback'),
      );
      const driver = NativeAuthDriver();
      await driver.recover(configuration, storage, 'learner@example.com');
      final recover = requests.single['body'] as Map;
      expect(recover['code_challenge_method'], 's256');
      expect(recover['code_challenge'], isA<String>());
      expect(
        (requests.single['query'] as Map)['redirect_to'],
        'com.geomath.dev://auth/callback',
      );
      expect(stored.values.single, contains('/passwordRecovery'));
      final verifier = stored.values.single.split('/').first;
      final response = await driver.exchange(
        configuration,
        storage,
        'fixture-auth-code',
      );
      expect(response['refresh_token'], 'opaque-fixture-refresh');
      expect(requests.last['path'], '/auth/v1/token');
      expect(requests.last['query'], {'grant_type': 'pkce'});
      expect(requests.last['body'], {
        'auth_code': 'fixture-auth-code',
        'code_verifier': verifier,
      });
      expect(requests.last['apikey'], 'public-fixture-key');
      expect(stored, isEmpty);
    } finally {
      await server.close(force: true);
      await subscription.cancel();
    }
  });
}
