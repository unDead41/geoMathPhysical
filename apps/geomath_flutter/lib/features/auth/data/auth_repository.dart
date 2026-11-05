import 'package:flutter/foundation.dart';

import '../../../core/session/auth_session.dart';
import '../../../core/result.dart';

enum AccountRole { student, teacher }

enum LogoutScope { local, others, global }

final class AccountIdentity {
  const AccountIdentity({
    required this.id,
    required this.email,
    required this.googleOnly,
  });
  final String id;
  final String email;
  final bool googleOnly;
}

final class RecordedSession {
  const RecordedSession({
    required this.isCurrent,
    required this.status,
    this.startedAt,
    this.userAgent,
  });
  final bool isCurrent;
  final String status;
  final DateTime? startedAt;
  final String? userAgent;
}

final class SecuritySessions {
  SecuritySessions({
    required this.serverNow,
    required List<RecordedSession> rows,
    required this.truncated,
  }) : rows = List.unmodifiable(rows);
  final DateTime serverNow;
  final List<RecordedSession> rows;
  final bool truncated;
}

/// Native authentication uses the foundation's single identity owner.
abstract class AuthRepository extends ChangeNotifier {
  AuthSession get sessions;
  bool get configured;
  bool get nativeCallbackReady;
  AccountIdentity? get identity;
  bool get recoveryRequired;
  AppFailure? get callbackFailure => null;
  Future<Result<void>> restore();
  Future<Result<void>> login({
    required String identifier,
    required String password,
  });
  Future<Result<void>> signup({
    required String email,
    required String username,
    required String password,
    required String displayName,
    required AccountRole role,
  });
  Future<Result<void>> resendConfirmation(String email);
  Future<Result<void>> requestRecovery(String email);
  Future<Result<void>> recoverLegacy({
    required String username,
    required String password,
    required String recoveryCode,
  });
  Future<Result<void>> startGoogle();
  Future<Result<void>> handleCallback(Uri callback);
  Future<Result<void>> changePassword({
    required String password,
    required String currentPassword,
  });
  Future<Result<void>> resetPassword(String password);
  Future<Result<void>> logout(LogoutScope scope);
  Future<Result<SecuritySessions>> securitySessions();
}

abstract final class AccountValidation {
  static String username(String value) => value.trim().toLowerCase();
  static String email(String value) => value.trim().toLowerCase();
  static bool validUsername(String value) =>
      RegExp(r'^[a-z0-9_]{3,24}$').hasMatch(username(value));
  static bool validEmail(String value) {
    final normalized = email(value);
    return normalized.length <= 254 &&
        RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(normalized) &&
        !normalized.endsWith('@accounts.geodecoder.invalid');
  }

  static bool validPassword(String value) =>
      value.length >= 10 && value.length <= 128;
  static bool validSignupDisplayName(String value) =>
      value.trim().length <= 60 && validDisplayName(value);
  static bool validDisplayName(String value) {
    final name = value.trim();
    return name.runes.length >= 2 &&
        name.runes.length <= 60 &&
        !RegExp(r'[\x00-\x1f\x7f-\x9f]').hasMatch(name);
  }
}
