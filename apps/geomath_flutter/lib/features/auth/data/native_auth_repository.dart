import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;

import '../../../app/public_backend_configuration.dart';
import '../../../core/network/network_policy.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/session/auth_session.dart';
import '../../../core/session/session_store.dart';
import 'auth_repository.dart';
import 'auth_transport.dart';
import 'cloud_gateway.dart';
import 'native_auth_driver.dart';
import 'native_auth_links.dart';

/// The sole native credential owner. Auth intents serialize; newer intents
/// invalidate older responses before any protected write or actor adoption.
final class NativeAuthRepository extends AuthRepository
    implements CloudGateway {
  NativeAuthRepository({
    required this._sessions,
    required this._store,
    required PublicBackendConfiguration configuration,
    AuthTransport? transport,
    this._driver = const NativeAuthDriver(),
    this.nativeCallbackReady = false,
    this._links = const NativeAuthLinks(),
  }) : _connection = configuration.connection().valueOrNull,
       _transport = transport ?? NativeAuthTransport() {
    _installation;
    _bindingSubscription = _sessions.bindings.listen((binding) {
      var changed = _callbackFailure != null;
      _callbackFailure = null;
      if (_credentials != null && !_credentials!.matches(binding)) {
        _credentials = null;
        _identity = null;
        _recovery = false;
        changed = true;
      }
      if (changed) _notify();
    });
  }
  final SessionController _sessions;
  late final NetworkPolicy _network = NetworkPolicy(sessions: _sessions);
  late final String _installation = _sessions.current.isGuest
      ? _sessions.current.partition
      : '';
  final SessionStore _store;
  final AuthLinks _links;
  StreamSubscription<Uri>? _linkSubscription;
  bool _linksStarted = false;
  final Set<String> _callbackDigests = {};
  AppFailure? _callbackFailure;
  @override
  AppFailure? get callbackFailure => _callbackFailure;
  final PublicBackendConnection? _connection;
  final AuthTransport _transport;
  final NativeAuthDriver _driver;
  late final StreamSubscription<ActorBinding> _bindingSubscription;
  @override
  final bool nativeCallbackReady;
  _Credentials? _credentials;
  AccountIdentity? _identity;
  Map<String, Object?> _pending = {};
  Map<String, String> _pkce = {};
  Future<void> _tail = Future.value();
  Future<Result<void>>? _restore;
  bool _didRestore = false;
  int _intent = 0;
  bool _closed = false;
  bool _recovery = false;
  @override
  AuthSession get sessions => _sessions;
  @override
  bool get configured => _connection != null;
  @override
  AccountIdentity? get identity => _identity;
  @override
  bool get recoveryRequired =>
      _recovery && _credentials?.matches(_sessions.current) == true;

  bool _current(ActorBinding actor, int intent) =>
      !_closed && intent == _intent && _sessions.isCurrent(actor);
  void _check(ActorBinding actor, int intent) {
    if (!_current(actor, intent)) {
      throw const _AccountError(FailureCode.stale, 'auth.changed');
    }
  }

  Future<Result<T>> _serialized<T>(
    int intent,
    ActorBinding actor,
    Future<T> Function() action,
  ) {
    final completer = Completer<Result<T>>();
    _tail = _tail.then((_) async {
      try {
        _check(actor, intent);
        if (!configured) {
          throw const _AccountError(
            FailureCode.unavailable,
            'auth.unavailable',
          );
        }
        final value = await action();
        // Adoption intentionally changes the actor; each mutating action checks
        // immediately before publishing. Other actions check on both sides.
        completer.complete(Success(value));
      } on _AccountError catch (error) {
        completer.complete(
          Failed(
            AppFailure(
              code: error.code,
              message: error.message,
              retryAfter: error.retryAfter,
            ),
          ),
        );
      } on AuthException catch (error) {
        final stale = !_current(actor, intent);
        final rate =
            error.statusCode == '429' ||
            [
              'over_email_send_rate_limit',
              'over_request_rate_limit',
            ].contains(error.code);
        completer.complete(
          Failed(
            AppFailure(
              code: stale
                  ? FailureCode.stale
                  : rate
                  ? FailureCode.retryAfter
                  : ['400', '422'].contains(error.statusCode)
                  ? FailureCode.invalid
                  : ['401', '403'].contains(error.statusCode)
                  ? FailureCode.unauthorized
                  : FailureCode.unavailable,
              message: stale
                  ? 'auth.changed'
                  : rate
                  ? 'auth.rateLimited'
                  : ['400', '422'].contains(error.statusCode)
                  ? 'auth.invalidLink'
                  : ['401', '403'].contains(error.statusCode)
                  ? 'auth.signInRequired'
                  : 'auth.unavailable',
            ),
          ),
        );
      } catch (_) {
        completer.complete(
          Failed(
            AppFailure(
              code: _current(actor, intent)
                  ? FailureCode.network
                  : FailureCode.stale,
              message: _current(actor, intent)
                  ? 'auth.network'
                  : 'auth.changed',
            ),
          ),
        );
      }
    });
    return completer.future;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = _connection!.url.toString().replaceFirst(RegExp(r'/$'), '');
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  Future<AuthResponse> _send(
    String path, {
    String method = 'POST',
    Map<String, Object?>? body,
    String? token,
    Map<String, String>? query,
  }) => _transport.send(
    AuthRequest(
      uri: _uri(path, query),
      method: method,
      headers: {
        'apikey': _connection!.publishableKey,
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${token ?? _connection.publishableKey}',
      },
      body: body,
    ),
  );
  void _accepted(AuthResponse response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    final delay = _network.parseRetryAfter(response.retryAfter);
    throw _AccountError(
      switch (response.statusCode) {
        400 || 413 => FailureCode.invalid,
        401 => FailureCode.unauthorized,
        403 => FailureCode.unauthorized,
        409 => FailureCode.conflict,
        429 => FailureCode.retryAfter,
        404 || 405 || 501 => FailureCode.unavailable,
        _ => FailureCode.network,
      },
      switch (response.statusCode) {
        401 => 'auth.credentials',
        403 => 'auth.confirmFirst',
        409 => 'auth.usernameTaken',
        429 => 'auth.rateLimited',
        400 || 413 => 'auth.invalid',
        _ => 'auth.unavailable',
      },
      delay,
    );
  }

  Future<AccountIdentity> _verify(
    _Credentials credential,
    ActorBinding actor,
    int intent,
  ) async {
    _check(actor, intent);
    final response = await _send(
      '/auth/v1/user',
      method: 'GET',
      token: credential.accessToken,
    );
    _check(actor, intent);
    _accepted(response);
    if (response.data['id'] != credential.userId) {
      throw const _AccountError(FailureCode.unauthorized, 'auth.credentials');
    }
    final email = response.data['email'];
    final metadata = response.data['app_metadata'];
    final providers = metadata is Map ? metadata['providers'] : null;
    return AccountIdentity(
      id: credential.userId,
      email: email is String && email.length <= 254 ? email : '',
      googleOnly:
          providers is List &&
          providers.contains('google') &&
          !providers.contains('email'),
    );
  }

  Map<String, Object?> _envelope({_Credentials? credential}) => {
    'version': 1,
    'session': (credential ?? _credentials)?.toJson(),
    'pending': _pending,
    'pkce': _pkce,
  };
  Future<void> _persist(
    ActorBinding actor,
    int intent, {
    _Credentials? credential,
  }) async {
    _check(actor, intent);
    final result = await _store.write(
      jsonEncode(_envelope(credential: credential)),
    );
    if (!_current(actor, intent)) {
      // Auth writes share this queue: clearing here cannot erase a newer login.
      await _store.clear();
      _check(actor, intent);
    }
    if (result case Failed<void>()) {
      throw const _AccountError(FailureCode.storage, 'auth.storage');
    }
  }

  Future<void> _adopt(
    Map<String, Object?> value,
    ActorBinding actor,
    int intent, {
    bool recovery = false,
    Map? resumeEnvelope,
  }) async {
    final credential = _Credentials.parse(value);
    final account = await _verify(credential, actor, intent);
    // Keep a bounded cold-start intent in the same atomic protected session
    // write, so a process death cannot lose its PKCE verifier between writes.
    final pending = resumeEnvelope?['pending'];
    final pkce = resumeEnvelope?['pkce'];
    _pending = pending is Map && _validPending(pending)
        ? Map<String, Object?>.from(pending)
        : {};
    _pkce =
        pkce is Map &&
            pkce.length <= 4 &&
            pkce.entries.every(
              (entry) =>
                  entry.key is String &&
                  entry.value is String &&
                  (entry.key as String).length <= 200 &&
                  (entry.value as String).length <= 1024,
            )
        ? Map<String, String>.from(pkce)
        : {};
    await _persist(actor, intent, credential: credential);
    _check(actor, intent);
    _credentials = credential;
    _identity = account;
    _recovery = recovery;
    _callbackFailure = null;
    _sessions.bindUser(
      userId: credential.userId,
      sessionId: credential.sessionId,
    );
    _notify();
  }

  @override
  Future<Result<void>> restore() {
    if (_restore case final pending?) return pending;
    if (_didRestore) return Future.value(const Success(null));
    final actor = _sessions.current;
    final intent = _intent;
    return _restore =
        _serialized(intent, actor, () async {
              final stored = await _store.read();
              _check(actor, intent);
              if (stored case Failed<String?>()) {
                throw const _AccountError(FailureCode.storage, 'auth.storage');
              }
              final text = stored.valueOrNull;
              if (text == null) return;
              final Object? decoded;
              try {
                decoded = jsonDecode(text);
              } catch (_) {
                throw const _AccountError(
                  FailureCode.invalid,
                  'auth.invalidSession',
                );
              }
              if (decoded is! Map || decoded['version'] != 1) {
                throw const _AccountError(
                  FailureCode.invalid,
                  'auth.invalidSession',
                );
              }
              final raw = decoded['session'];
              if (raw == null) {
                await _restorePending(decoded, actor, intent, null);
                return;
              }
              if (raw is! Map<String, dynamic>) {
                throw const _AccountError(
                  FailureCode.invalid,
                  'auth.invalidSession',
                );
              }
              final old = _Credentials.parse(raw);
              final response = await _send(
                '/auth/v1/token',
                query: {'grant_type': 'refresh_token'},
                body: {'refresh_token': old.refreshToken},
              );
              _check(actor, intent);
              _accepted(response);
              final refreshed = _Credentials.parse(response.data);
              if (refreshed.userId != old.userId ||
                  refreshed.sessionId != old.sessionId) {
                throw const _AccountError(FailureCode.stale, 'auth.changed');
              }
              await _adopt(
                response.data,
                actor,
                intent,
                resumeEnvelope: decoded,
              );
              await _restorePending(
                decoded,
                _sessions.current,
                intent,
                refreshed,
              );
            })
            .then((result) async {
              _didRestore = result.isSuccess;
              if (result.isSuccess && nativeCallbackReady) await _attachLinks();
              return result;
            })
            .whenComplete(() {
              _restore = null;
            });
  }

  Future<void> _attachLinks() async {
    if (_linksStarted || _closed) return;
    _linksStarted = true;
    Future<void> receive(Uri value) async {
      if (_closed) return;
      // app_links can deliver the initial URI again through the warm stream.
      // Retain a bounded digest only; raw authorization codes are never stored.
      final digest = sha256.convert(utf8.encode(value.toString())).toString();
      if (!_callbackDigests.add(digest)) return;
      if (_callbackDigests.length > 8) {
        _callbackDigests.remove(_callbackDigests.first);
      }
      final actor = _sessions.current;
      final intent = _intent;
      final result = await handleCallback(value);
      // Successful adoption clears its own error state under the guarded
      // operation. A late denial belongs only to the original full binding.
      if (!_current(actor, intent) || result.isSuccess) return;
      _callbackFailure = result.failureOrNull;
      _notify();
    }

    try {
      _linkSubscription = _links.callbacks.listen(
        (value) => unawaited(receive(value)),
        onError: (Object error) {
          if (_closed) return;
          _callbackFailure = const AppFailure(
            code: FailureCode.unavailable,
            message: 'auth.callbackUnavailable',
          );
          _notify();
        },
      );
      final initial = await _links.initial();
      if (initial != null && !_closed) await receive(initial);
    } catch (_) {
      _callbackFailure = const AppFailure(
        code: FailureCode.unavailable,
        message: 'auth.callbackUnavailable',
      );
      _notify();
    }
  }

  bool _validPending(Map value) {
    final created = DateTime.tryParse(
      value['created'] is String ? value['created'] as String : '',
    );
    final expires = DateTime.tryParse(
      value['expires'] is String ? value['expires'] as String : '',
    );
    final now = DateTime.now().toUtc();
    return ['google', 'recovery', 'confirmation'].contains(value['kind']) &&
        value['nonce'] is String &&
        RegExp(r'^[A-Za-z0-9_-]{32}$').hasMatch(value['nonce'] as String) &&
        created != null &&
        expires != null &&
        !created.isAfter(now) &&
        expires.isAfter(now) &&
        expires.difference(created) <= const Duration(minutes: 30);
  }

  Future<void> _cancelPending(ActorBinding actor, int intent) async {
    if (_pending.isEmpty && _pkce.isEmpty) return;
    _pending = {};
    _pkce = {};
    await _persist(actor, intent);
  }

  Future<void> _restorePending(
    Map decoded,
    ActorBinding actor,
    int intent,
    _Credentials? verified,
  ) async {
    _check(actor, intent);
    final pending = decoded['pending'];
    final pkce = decoded['pkce'];
    if (pending is! Map ||
        pkce is! Map ||
        !_validPending(pending) ||
        pending['installation'] != _installation ||
        pending['scope'] != actor.scope ||
        pkce.isEmpty ||
        pkce.length > 4 ||
        pkce.entries.any(
          (entry) =>
              entry.key is! String ||
              entry.value is! String ||
              (entry.key as String).length > 200 ||
              (entry.value as String).length > 1024,
        )) {
      _pending = {};
      _pkce = {};
      return;
    }
    final sameIdentity = verified == null
        ? actor.isGuest &&
              pending['partition'] == actor.partition &&
              pending['user_id'] == null
        : pending['partition'] == 'owner:${verified.userId}' &&
              pending['user_id'] == verified.userId &&
              pending['verified_session'] == verified.sessionId;
    if (!sameIdentity) {
      _pending = {};
      _pkce = {};
      return;
    }
    // The fresh epoch is allowed only after this protected stable installation
    // and (when signed in) refreshed+server-verified session match.
    _pending = Map<String, Object?>.from(pending)
      ..addAll({
        'partition': actor.partition,
        'session': actor.sessionId,
        'epoch': actor.epoch,
        'scope': actor.scope,
      });
    _pkce = Map<String, String>.from(pkce);
    await _persist(actor, intent);
  }

  @override
  Future<Result<void>> login({
    required String identifier,
    required String password,
  }) {
    final intent = ++_intent;
    final actor = _sessions.current;
    return _serialized(intent, actor, () async {
      await _cancelPending(actor, intent);
      final normalized = identifier.trim().toLowerCase();
      if (!(AccountValidation.validEmail(normalized) ||
              AccountValidation.validUsername(normalized)) ||
          !AccountValidation.validPassword(password)) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalid');
      }
      final response = await _send(
        '/functions/v1/geodecoder-auth',
        body: {'action': 'login', 'username': normalized, 'password': password},
      );
      _check(actor, intent);
      _accepted(response);
      final session = response.data['session'];
      if (session is! Map<String, dynamic>) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalidSession');
      }
      await _adopt(session, actor, intent);
    });
  }

  @override
  Future<Result<void>> recoverLegacy({
    required String username,
    required String password,
    required String recoveryCode,
  }) {
    final intent = ++_intent;
    final actor = _sessions.current;
    return _serialized(intent, actor, () async {
      await _cancelPending(actor, intent);
      final code = recoveryCode.trim().toLowerCase();
      if (!AccountValidation.validUsername(username) ||
          !AccountValidation.validPassword(password) ||
          !RegExp(r'^[a-f0-9]{32}$').hasMatch(code)) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalid');
      }
      final response = await _send(
        '/functions/v1/geodecoder-auth',
        body: {
          'action': 'recover',
          'username': AccountValidation.username(username),
          'password': password,
          'recovery_code': code,
        },
      );
      _check(actor, intent);
      _accepted(response);
      // The canonical gateway revokes legacy sessions server-side and returns
      // a message, never a session to adopt. Real-email accounts use links.
      if (response.data['message'] is! String ||
          response.data.containsKey('session')) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalidSession');
      }
    });
  }

  @override
  Future<Result<void>> signup({
    required String email,
    required String username,
    required String password,
    required String displayName,
    required AccountRole role,
  }) {
    final intent = ++_intent;
    final actor = _sessions.current;
    return _serialized(intent, actor, () async {
      await _cancelPending(actor, intent);
      if (!AccountValidation.validEmail(email) ||
          !AccountValidation.validUsername(username) ||
          !AccountValidation.validPassword(password) ||
          !AccountValidation.validSignupDisplayName(displayName)) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalid');
      }
      final response = await _send(
        '/functions/v1/geodecoder-auth',
        body: {
          'action': 'signup',
          'username': AccountValidation.username(username),
          'email': AccountValidation.email(email),
          'password': password,
          'display_name': displayName.trim(),
          'role': role.name,
        },
      );
      _check(actor, intent);
      _accepted(response);
      if (response.data['confirmation_required'] != true) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalidSession');
      }
      // The deployed gateway uses the canonical web confirmation redirect.
      // A signup acknowledgement never installs an unconfirmed account.
    });
  }

  ProtectedPkceStorage _storage(ActorBinding actor, int intent) =>
      ProtectedPkceStorage(
        read: (key) async {
          _check(actor, intent);
          return _pkce[key];
        },
        write: (key, value) async {
          _check(actor, intent);
          if (key.length > 200 || value.length > 1024) {
            throw const _AccountError(FailureCode.invalid, 'auth.invalid');
          }
          _pkce[key] = value;
          await _persist(actor, intent);
        },
        remove: (key) async {
          _check(actor, intent);
          _pkce.remove(key);
          await _persist(actor, intent);
        },
      );
  Future<Result<void>> _beginCallback(
    String kind,
    Future<void> Function(ActorBinding actor, int intent) action,
  ) {
    final intent = ++_intent;
    final actor = _sessions.current;
    return _serialized(intent, actor, () async {
      if (!nativeCallbackReady) {
        throw const _AccountError(
          FailureCode.unavailable,
          'auth.callbackUnavailable',
        );
      }
      final created = DateTime.now().toUtc();
      _pending = {
        'kind': kind,
        'nonce': base64Url.encode(
          List<int>.generate(24, (_) => Random.secure().nextInt(256)),
        ),
        'installation': _installation,
        'user_id': actor.userId,
        'verified_session': _credentials?.sessionId,
        'partition': actor.partition,
        'session': actor.sessionId,
        'epoch': actor.epoch,
        'scope': actor.scope,
        'created': created.toIso8601String(),
        'expires': created.add(const Duration(minutes: 30)).toIso8601String(),
      };
      _pkce = {};
      _callbackFailure = null;
      await _persist(actor, intent);
      try {
        await action(actor, intent);
        _check(actor, intent);
      } catch (_) {
        if (_current(actor, intent)) {
          _pending = {};
          _pkce = {};
          await _persist(actor, intent);
        }
        rethrow;
      }
    });
  }

  @override
  Future<Result<void>> startGoogle() =>
      _beginCallback('google', (actor, intent) async {
        final settings = await _send('/auth/v1/settings', method: 'GET');
        _check(actor, intent);
        _accepted(settings);
        final external = settings.data['external'];
        if (external is! Map || external['google'] != true) {
          throw const _AccountError(
            FailureCode.unavailable,
            'auth.googleUnavailable',
          );
        }
        final launched = await _driver.google(
          _connection!,
          _storage(actor, intent),
        );
        _check(actor, intent);
        if (!launched) {
          throw const _AccountError(
            FailureCode.unavailable,
            'auth.googleUnavailable',
          );
        }
      });
  @override
  Future<Result<void>> requestRecovery(String email) {
    if (!AccountValidation.validEmail(email)) {
      return Future.value(
        const Failed(
          AppFailure(code: FailureCode.invalid, message: 'auth.invalidEmail'),
        ),
      );
    }
    return _beginCallback(
      'recovery',
      (actor, intent) => _driver.recover(
        _connection!,
        _storage(actor, intent),
        AccountValidation.email(email),
      ),
    );
  }

  @override
  Future<Result<void>> resendConfirmation(String email) {
    if (!AccountValidation.validEmail(email)) {
      return Future.value(
        const Failed(
          AppFailure(code: FailureCode.invalid, message: 'auth.invalidEmail'),
        ),
      );
    }
    return _beginCallback(
      'confirmation',
      (actor, intent) => _driver.resend(
        _connection!,
        _storage(actor, intent),
        AccountValidation.email(email),
      ),
    );
  }

  @override
  Future<Result<void>> handleCallback(Uri callback) {
    final actor = _sessions.current;
    final intent = _intent;
    return _serialized(intent, actor, () async {
      final expected = _connection!.redirectUri;
      final code = callback.queryParameters['code'];
      final created = DateTime.tryParse(_pending['created'] as String? ?? '');
      if (!nativeCallbackReady ||
          !_validPending(_pending) ||
          callback.scheme != expected.scheme ||
          callback.host != expected.host ||
          callback.path != expected.path ||
          callback.userInfo.isNotEmpty ||
          callback.hasPort ||
          callback.hasFragment ||
          callback.queryParametersAll.keys.any((key) => key != 'code') ||
          callback.queryParametersAll['code']?.length != 1 ||
          code == null ||
          code.isEmpty ||
          code.length > 2048 ||
          _pkce.isEmpty ||
          created == null ||
          DateTime.now().toUtc().difference(created).abs() >
              const Duration(minutes: 30) ||
          _pending['partition'] != actor.partition ||
          _pending['session'] != actor.sessionId ||
          _pending['epoch'] != actor.epoch ||
          _pending['scope'] != actor.scope) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalidLink');
      }
      final kind = _pending['kind'];
      // Consume the pending intent before the exchange: replays cannot adopt.
      _pending = {};
      await _persist(actor, intent);
      final session = await _driver.exchange(
        _connection,
        _storage(actor, intent),
        code,
      );
      _check(actor, intent);
      await _adopt(session, actor, intent, recovery: kind == 'recovery');
    });
  }

  Future<_Credentials> _bound(ActorBinding actor, int intent) async {
    _check(actor, intent);
    final original = _credentials;
    if (original == null || !original.matches(actor)) {
      throw const _AccountError(
        FailureCode.unauthorized,
        'auth.signInRequired',
      );
    }
    if (original.expiresAt >
        DateTime.now().millisecondsSinceEpoch ~/ 1000 + 30) {
      return original;
    }
    final response = await _send(
      '/auth/v1/token',
      query: {'grant_type': 'refresh_token'},
      body: {'refresh_token': original.refreshToken},
    );
    _check(actor, intent);
    _accepted(response);
    final refreshed = _Credentials.parse(response.data);
    if (!refreshed.matches(actor)) {
      throw const _AccountError(FailureCode.stale, 'auth.changed');
    }
    await _verify(refreshed, actor, intent);
    await _persist(actor, intent, credential: refreshed);
    _credentials = refreshed;
    return refreshed;
  }

  @override
  Future<Result<CloudReply>> rpc({
    required String name,
    required Map<String, Object?> parameters,
    required ActorBinding actor,
  }) async {
    if (!RegExp(r'^geo_[a-z0-9_]{1,80}$').hasMatch(name)) {
      return const Failed(
        AppFailure(code: FailureCode.invalid, message: 'auth.invalid'),
      );
    }
    final Map<String, Object?> capturedParameters;
    try {
      capturedParameters =
          jsonDecode(jsonEncode(parameters)) as Map<String, dynamic>;
    } catch (_) {
      return const Failed(
        AppFailure(code: FailureCode.invalid, message: 'auth.invalid'),
      );
    }
    final intent = _intent;
    final prepared = await _serialized(
      intent,
      actor,
      () => _bound(actor, intent),
    );
    if (prepared case Failed<_Credentials>(:final failure)) {
      return Failed(failure);
    }
    final credential = prepared.valueOrNull!;
    try {
      _check(actor, intent);
      // Capture before await; the transport cannot swap in a newer account.
      final response = await _send(
        '/rest/v1/rpc/$name',
        body: Map.unmodifiable(capturedParameters),
        token: credential.accessToken,
      );
      _check(actor, intent);
      if (_credentials?.matches(actor) != true) {
        throw const _AccountError(FailureCode.stale, 'auth.changed');
      }
      _accepted(response);
      return Success(
        CloudReply(
          data: response.data,
          statusCode: response.statusCode,
          retryAfter: _network.parseRetryAfter(response.retryAfter),
        ),
      );
    } on _AccountError catch (error) {
      return Failed(
        AppFailure(
          code: error.code,
          message: error.message,
          retryAfter: error.retryAfter,
        ),
      );
    } catch (_) {
      final current =
          _current(actor, intent) && _credentials?.matches(actor) == true;
      return Failed(
        AppFailure(
          code: current ? FailureCode.network : FailureCode.stale,
          message: current ? 'auth.network' : 'auth.changed',
        ),
      );
    }
  }

  @override
  Future<Result<void>> changePassword({
    required String password,
    required String currentPassword,
  }) => _password(password, currentPassword: currentPassword, recovery: false);
  @override
  Future<Result<void>> resetPassword(String password) =>
      _password(password, recovery: true);
  Future<Result<void>> _password(
    String password, {
    String? currentPassword,
    required bool recovery,
  }) {
    final intent = ++_intent;
    final actor = _sessions.current;
    return _serialized(intent, actor, () async {
      await _cancelPending(actor, intent);
      if (!AccountValidation.validPassword(password) ||
          !recovery &&
              (currentPassword == null ||
                  currentPassword.isEmpty ||
                  currentPassword.length > 128)) {
        throw const _AccountError(FailureCode.invalid, 'auth.invalidPassword');
      }
      if (recovery && !recoveryRequired) {
        throw const _AccountError(FailureCode.unauthorized, 'auth.invalidLink');
      }
      final credential = await _bound(actor, intent);
      final verified = await _verify(credential, actor, intent);
      _Credentials? temporary;
      try {
        if (!recovery) {
          if (verified.googleOnly ||
              !AccountValidation.validEmail(verified.email)) {
            throw const _AccountError(
              FailureCode.unavailable,
              'auth.googleSecurity',
            );
          }
          final check = await _send(
            '/auth/v1/token',
            query: {'grant_type': 'password'},
            body: {'email': verified.email, 'password': currentPassword},
          );
          _check(actor, intent);
          _accepted(check);
          final reauthenticated = _Credentials.parse(check.data);
          if (reauthenticated.userId != actor.userId) {
            throw const _AccountError(
              FailureCode.unauthorized,
              'auth.credentials',
            );
          }
          temporary = reauthenticated;
          // Fresh verification credentials authorize only this update. They
          // never replace the application's protected session or actor.
        }
        final update = await _send(
          '/auth/v1/user',
          method: 'PUT',
          token: (temporary ?? credential).accessToken,
          body: {
            'password': password,
            if (!recovery) 'current_password': currentPassword,
          },
        );
        _check(actor, intent);
        _accepted(update);
        if (update.data['id'] != actor.userId) {
          throw const _AccountError(FailureCode.unauthorized, 'auth.changed');
        }
        _recovery = false;
        _notify();
        if (recovery) {
          try {
            final revoke = await _send(
              '/auth/v1/logout',
              query: {'scope': 'global'},
              token: credential.accessToken,
            );
            _check(actor, intent);
            if (revoke.statusCode < 200 || revoke.statusCode >= 300) {
              throw const _AccountError(
                FailureCode.unavailable,
                'auth.passwordUpdatedLogoutFailed',
              );
            }
          } catch (_) {
            _check(actor, intent);
            throw const _AccountError(
              FailureCode.unavailable,
              'auth.passwordUpdatedLogoutFailed',
            );
          }
          await _clear(actor, intent);
        }
      } finally {
        // Cleanup targets only the temporary local verification session.
        if (temporary != null) {
          try {
            await _send(
              '/auth/v1/logout',
              query: {'scope': 'local'},
              token: temporary.accessToken,
            );
          } catch (_) {
            /* No cleanup claim. */
          }
        }
      }
    });
  }

  Future<void> _clear(ActorBinding actor, int intent) async {
    _check(actor, intent);
    final cleared = await _store.clear();
    _check(actor, intent);
    if (!cleared.isSuccess) {
      throw const _AccountError(FailureCode.storage, 'auth.storage');
    }
    _credentials = null;
    _identity = null;
    _pending = {};
    _pkce = {};
    _recovery = false;
    _sessions.logout();
    _notify();
  }

  @override
  Future<Result<void>> logout(LogoutScope scope) {
    final intent = ++_intent;
    final actor = _sessions.current;
    return _serialized(intent, actor, () async {
      await _cancelPending(actor, intent);
      if (actor.isGuest) {
        await _clear(actor, intent);
        return;
      }
      final credential = await _bound(actor, intent);
      final response = await _send(
        '/auth/v1/logout',
        query: {'scope': scope.name},
        token: credential.accessToken,
      );
      _check(actor, intent);
      // SDK signOut treats 401/403/404 as success; this flow requires actual 2xx.
      _accepted(response);
      if (scope != LogoutScope.others) await _clear(actor, intent);
    });
  }

  @override
  Future<Result<SecuritySessions>> securitySessions() async {
    final actor = _sessions.current;
    final response = await rpc(
      name: 'geo_security_sessions',
      parameters: const {},
      actor: actor,
    );
    if (response case Failed<CloudReply>(:final failure)) {
      return Failed(failure);
    }
    final reply = response.valueOrNull!;
    if (reply.errorCode != null) {
      return const Failed(
        AppFailure(
          code: FailureCode.unavailable,
          message: 'auth.sessionsUnavailable',
        ),
      );
    }
    try {
      final value = reply.data;
      final now = DateTime.parse(value['server_now'] as String);
      final capabilities = value['capabilities'];
      final raw = value['sessions'];
      if (capabilities is! Map ||
          capabilities['revoke_individual'] != false ||
          raw is! List ||
          raw.length > 100 ||
          value['truncated'] is! bool) {
        throw const FormatException();
      }
      final rows = <RecordedSession>[];
      for (final item in raw) {
        if (item is! Map ||
            item['is_current'] is! bool ||
            !['recorded', 'expired'].contains(item['status']) ||
            item.keys.any(
              (key) => ![
                'is_current',
                'started_at',
                'user_agent',
                'status',
              ].contains(key),
            )) {
          throw const FormatException();
        }
        final agent = item['user_agent'];
        if (agent != null && (agent is! String || agent.length > 512)) {
          throw const FormatException();
        }
        rows.add(
          RecordedSession(
            isCurrent: item['is_current'] as bool,
            status: item['status'] as String,
            startedAt: item['started_at'] == null
                ? null
                : DateTime.parse(item['started_at'] as String),
            userAgent: agent as String?,
          ),
        );
      }
      if (rows
                  .where((row) => row.isCurrent && row.status == 'recorded')
                  .length !=
              1 ||
          rows.where((row) => row.isCurrent).length != 1) {
        throw const FormatException();
      }
      return Success(
        SecuritySessions(
          serverNow: now,
          rows: rows,
          truncated: value['truncated'] as bool,
        ),
      );
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.invalid,
          message: 'auth.sessionsUnavailable',
        ),
      );
    }
  }

  void _notify() {
    if (!_closed) notifyListeners();
  }

  @override
  void dispose() {
    if (_closed) return;
    _closed = true;
    ++_intent;
    _credentials = null;
    _identity = null;
    _pending = {};
    _pkce = {};
    unawaited(_bindingSubscription.cancel());
    unawaited(_linkSubscription?.cancel());
    _transport.close();
    super.dispose();
  }
}

final class _AccountError implements Exception {
  const _AccountError(this.code, this.message, [this.retryAfter]);
  final FailureCode code;
  final String message;
  final Duration? retryAfter;
}

final class _Credentials {
  const _Credentials(
    this.accessToken,
    this.refreshToken,
    this.userId,
    this.sessionId,
    this.expiresAt,
  );
  final String accessToken;
  final String refreshToken;
  final String userId;
  final String sessionId;
  final int expiresAt;
  static _Credentials parse(Map<String, Object?> value) {
    try {
      final access = value['access_token'] as String;
      final refresh = value['refresh_token'] as String;
      if (access.length > 32768 || refresh.isEmpty || refresh.length > 32768) {
        throw const FormatException();
      }
      final segments = access.split('.');
      if (segments.length != 3) throw const FormatException();
      final claims = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(segments[1]))),
      );
      final user = value['user'];
      final userId = user is Map ? user['id'] : value['user_id'];
      if (claims is! Map ||
          claims['sub'] != userId ||
          userId is! String ||
          userId.isEmpty ||
          claims['session_id'] is! String ||
          (claims['session_id'] as String).isEmpty ||
          claims['exp'] is! int) {
        throw const FormatException();
      }
      return _Credentials(
        access,
        refresh,
        userId,
        claims['session_id'] as String,
        claims['exp'] as int,
      );
    } catch (_) {
      throw const _AccountError(FailureCode.invalid, 'auth.invalidSession');
    }
  }

  bool matches(ActorBinding actor) =>
      actor.userId == userId && actor.sessionId == sessionId;
  Map<String, Object?> toJson() => {
    'access_token': accessToken,
    'refresh_token': refreshToken,
    'user_id': userId,
    'session_id': sessionId,
    'expires_at': expiresAt,
  };
}
