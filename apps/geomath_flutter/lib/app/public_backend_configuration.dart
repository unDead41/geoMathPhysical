import 'dart:convert';

import '../core/result.dart';

/// Public connection configuration only. A valid value is not a receipt of
/// hosted Auth, provider, RPC or migration availability. Prompt 3 probes those.
final class PublicBackendConnection {
  const PublicBackendConnection({
    required this.url,
    required this.publishableKey,
    required this.redirectUri,
  });
  final Uri url;
  final String publishableKey;
  final Uri redirectUri;
}

final class PublicBackendConfiguration {
  const PublicBackendConfiguration({
    this.url = '',
    this.publishableKey = '',
    this.redirectUri = 'com.geomath.dev://auth/callback',
  });
  const PublicBackendConfiguration.fromEnvironment()
    : url = const String.fromEnvironment('GEOMATH_SUPABASE_URL'),
      publishableKey = const String.fromEnvironment(
        'GEOMATH_SUPABASE_PUBLISHABLE_KEY',
      ),
      redirectUri = const String.fromEnvironment(
        'GEOMATH_AUTH_REDIRECT_URI',
        defaultValue: 'com.geomath.dev://auth/callback',
      );
  final String url;
  final String publishableKey;
  final String redirectUri;

  Result<PublicBackendConnection> connection() {
    if (url.isEmpty || publishableKey.isEmpty) {
      return const Failed(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'Online account capabilities have not been configured.',
        ),
      );
    }
    final endpoint = Uri.tryParse(url);
    final redirect = Uri.tryParse(redirectUri);
    if (endpoint == null ||
        endpoint.scheme != 'https' ||
        endpoint.host.isEmpty ||
        endpoint.userInfo.isNotEmpty ||
        endpoint.hasQuery ||
        endpoint.hasFragment ||
        redirect == null ||
        redirect.scheme != 'com.geomath.dev' ||
        redirect.host != 'auth' ||
        redirect.path != '/callback' ||
        redirect.hasQuery ||
        redirect.hasFragment ||
        !_isPublicKey(publishableKey)) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message:
              'The public backend configuration is invalid or unsupported.',
        ),
      );
    }
    return Success(
      PublicBackendConnection(
        url: endpoint,
        publishableKey: publishableKey,
        redirectUri: redirect,
      ),
    );
  }

  bool _isPublicKey(String value) {
    if (RegExp(r'^sb_publishable_[A-Za-z0-9_-]{20,}$').hasMatch(value)) {
      return true;
    }
    // Legacy anon keys remain public configuration; service-role JWTs do not.
    try {
      final parts = value.split('.');
      if (parts.length != 3) {
        return false;
      }
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      return payload is Map<String, dynamic> && payload['role'] == 'anon';
    } catch (_) {
      return false;
    }
  }
}
