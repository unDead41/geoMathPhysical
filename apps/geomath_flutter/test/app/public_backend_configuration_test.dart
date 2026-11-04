import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/core/result.dart';

void main() {
  test(
    'missing public configuration is unavailable without a bootstrap crash',
    () {
      final result = const PublicBackendConfiguration().connection();
      expect(result, isA<Failed<PublicBackendConnection>>());
      expect((result as Failed).failure.code, FailureCode.unavailable);
    },
  );
  test(
    'only HTTPS public configuration and exact development callback accepted',
    () {
      const key = 'sb_publishable_developmentFixture0123456789';
      expect(
        const PublicBackendConfiguration(
          url: 'https://example.supabase.co',
          publishableKey: key,
        ).connection(),
        isA<Success<PublicBackendConnection>>(),
      );
      for (final url in [
        'http://example.supabase.co',
        'https://user:password@example.supabase.co',
        'https://example.supabase.co?token=fixture',
      ]) {
        expect(
          PublicBackendConfiguration(
            url: url,
            publishableKey: key,
          ).connection(),
          isA<Failed<PublicBackendConnection>>(),
        );
      }
      expect(
        const PublicBackendConfiguration(
          url: 'https://example.supabase.co',
          publishableKey: key,
          redirectUri: 'other://auth/callback',
        ).connection(),
        isA<Failed<PublicBackendConnection>>(),
      );
    },
  );
  test('service-role and secret credentials cannot be used as public configuration', () {
    final payload = base64Url.encode(
      utf8.encode(jsonEncode({'role': 'service_role'})),
    );
    for (final key in [
      'sb_secret_fixtureSecretIsNotARealCredential',
      'fixture.$payload.fixture',
    ]) {
      final result = PublicBackendConfiguration(
        url: 'https://example.supabase.co',
        publishableKey: key,
      ).connection();
      expect(result, isA<Failed<PublicBackendConnection>>());
      expect((result as Failed).failure.message, isNot(contains(key)));
    }
  });
}
