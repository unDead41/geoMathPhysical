import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../app/public_backend_configuration.dart';

/// PKCE uses the same protected envelope as the native session owner.
final class ProtectedPkceStorage extends GotrueAsyncStorage {
  const ProtectedPkceStorage({
    required this.read,
    required this.write,
    required this.remove,
  });
  final Future<String?> Function(String key) read;
  final Future<void> Function(String key, String value) write;
  final Future<void> Function(String key) remove;
  @override
  Future<String?> getItem({required String key}) => read(key);
  @override
  Future<void> setItem({required String key, required String value}) =>
      write(key, value);
  @override
  Future<void> removeItem({required String key}) => remove(key);
}

/// Pinned GoTrue 2.27.3 APIs exported by supabase_flutter 2.18.3.
/// No global Supabase singleton or SharedPreferences auth store is created.
class NativeAuthDriver {
  const NativeAuthDriver();
  GoTrueClient _client(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
  ) => GoTrueClient(
    url: '${config.url.toString().replaceFirst(RegExp(r'/$'), '')}/auth/v1',
    headers: {
      'apikey': config.publishableKey,
      'Authorization': 'Bearer ${config.publishableKey}',
    },
    autoRefreshToken: false,
    asyncStorage: storage,
    flowType: AuthFlowType.pkce,
  );
  Future<bool> google(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
  ) async {
    final client = _client(config, storage);
    try {
      return await client
          .signInWithOAuth(
            OAuthProvider.google,
            redirectTo: config.redirectUri.toString(),
            authScreenLaunchMode: LaunchMode.externalApplication,
          )
          .timeout(const Duration(seconds: 20));
    } finally {
      client.dispose();
    }
  }

  Future<void> recover(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
    String email,
  ) async {
    final client = _client(config, storage);
    try {
      await client
          .resetPasswordForEmail(
            email,
            redirectTo: config.redirectUri.toString(),
          )
          .timeout(const Duration(seconds: 20));
    } finally {
      client.dispose();
    }
  }

  Future<void> resend(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
    String email,
  ) async {
    final client = _client(config, storage);
    try {
      await client
          .resend(
            type: OtpType.signup,
            email: email,
            emailRedirectTo: config.redirectUri.toString(),
          )
          .timeout(const Duration(seconds: 20));
    } finally {
      client.dispose();
    }
  }

  Future<Map<String, Object?>> exchange(
    PublicBackendConnection config,
    ProtectedPkceStorage storage,
    String code,
  ) async {
    final client = _client(config, storage);
    try {
      return (await client
              .exchangeCodeForSession(code)
              .timeout(const Duration(seconds: 20)))
          .session
          .toJson();
    } finally {
      client.dispose();
    }
  }
}
