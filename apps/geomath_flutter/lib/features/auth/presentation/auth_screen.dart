import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/lifecycle/app_lifecycle.dart';
import '../../../core/navigation/app_navigation.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/widgets/widgets.dart';
import '../data/auth_repository.dart';

enum AuthScreenMode {
  legacyRecovery,
  login,
  signup,
  recover,
  confirmation,
  reset,
  security,
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.repository, required this.mode});
  final AuthRepository repository;
  final AuthScreenMode mode;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _identifier = TextEditingController();
  final _email = TextEditingController();
  final _username = TextEditingController();
  final _name = TextEditingController();
  final _password = TextEditingController();
  final _repeat = TextEditingController();
  final _currentPassword = TextEditingController();
  final _recoveryCode = TextEditingController();
  AccountRole _role = AccountRole.student;
  bool _busy = false;
  AppFailure? _failure;
  String? _success;
  StreamSubscription<ActorBinding>? _bindings;
  AppLifecycleController? _lifecycle;
  bool _wasCurrent = true;
  int _operation = 0;
  @override
  void initState() {
    super.initState();
    widget.repository.addListener(_changed);
    _bindings = widget.repository.sessions.bindings.listen((_) {
      ++_operation;
      _clearSecrets();
      _busy = false;
      if (mounted) {
        setState(() {
          _failure = null;
          _success = null;
        });
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final lifecycle = AppScope.of(context).dependencies.lifecycle;
    if (_lifecycle != lifecycle) {
      _lifecycle?.removeListener(_onLifecycle);
      _lifecycle = lifecycle..addListener(_onLifecycle);
    }
    final current = AppRouteScope.maybeOf(context)?.isCurrent ?? true;
    if (_wasCurrent && !current) _clearSecrets();
    _wasCurrent = current;
    final arguments = AppRouteScope.maybeOf(context)?.entry.arguments;
    if (_email.text.isEmpty && arguments?['email'] is String) {
      _email.text = arguments!['email'] as String;
    }
  }

  void _onLifecycle() {
    if (_lifecycle?.isForeground != true) _clearSecrets();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  void _clearSecrets() {
    _password.clear();
    _repeat.clear();
    _currentPassword.clear();
    _recoveryCode.clear();
  }

  String _t(String key) =>
      AppStrings.of(context).text(key.startsWith('auth.') ? key : 'auth.$key');
  Future<void> _run(
    Future<Result<void>> Function() action, {
    String success = 'done',
  }) async {
    if (_busy) return;
    final operation = ++_operation;
    setState(() {
      _busy = true;
      _failure = null;
      _success = null;
    });
    final result = await action();
    if (!mounted || operation != _operation) return;
    _clearSecrets();
    setState(() {
      _busy = false;
      _failure = result.failureOrNull;
      _success = result.isSuccess ? success : null;
    });
  }

  void _open(String route) {
    _clearSecrets();
    AppScope.of(context).router.open(route);
  }

  @override
  Widget build(BuildContext context) {
    final repository = widget.repository;
    final mode = widget.mode;
    final callbackAction =
        mode == AuthScreenMode.recover || mode == AuthScreenMode.confirmation;
    final canUse = repository.configured && !_busy;
    final passwordMode =
        mode == AuthScreenMode.signup ||
        mode == AuthScreenMode.legacyRecovery ||
        mode == AuthScreenMode.reset ||
        mode == AuthScreenMode.security;
    return GeoMathScaffold(
      title: _t(mode.name),
      showBackButton: true,
      onBack: () => AppScope.of(context).router.back(),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!repository.configured)
            StatusNotice(
              key: const Key('auth-unavailable'),
              message: _t('unavailable'),
            ),
          if (repository.configured && !repository.nativeCallbackReady)
            StatusNotice(
              key: const Key('auth-callback-unavailable'),
              message: _t('callbackUnavailable'),
            ),
          if (repository.callbackFailure case final failure?)
            StatusNotice(tone: StatusTone.error, message: _t(failure.message)),
          if (repository.recoveryRequired)
            ActionButton(
              label: _t('reset'),
              onPressed: !_busy ? () => _open('cloud-game-reset') : null,
            ),
          if (_failure case final failure?) ...[
            const SizedBox(height: 12),
            StatusNotice(tone: StatusTone.error, message: _t(failure.message)),
            if (failure.retryAfter case final delay?)
              Text(
                AppStrings.of(context).text(
                  'auth.retryIn',
                  parameters: {'seconds': delay.inSeconds},
                ),
              ),
          ],
          if (_success case final success?)
            StatusNotice(tone: StatusTone.success, message: _t(success)),
          const SizedBox(height: 16),
          if (mode == AuthScreenMode.login) ...[
            LabeledField(
              label: _t('identifier'),
              controller: _identifier,
              enabled: canUse,
              autofillHints: const [AutofillHints.username],
            ),
            const SizedBox(height: 12),
            LabeledField(
              label: _t('password'),
              controller: _password,
              obscureText: true,
              enabled: canUse,
              autofillHints: const [AutofillHints.password],
            ),
            const SizedBox(height: 20),
            ActionButton(
              key: const Key('auth-login-submit'),
              label: _t('login'),
              busy: _busy,
              busyLabel: _t('working'),
              onPressed: canUse
                  ? () => _run(
                      () => repository.login(
                        identifier: _identifier.text,
                        password: _password.text,
                      ),
                    )
                  : null,
            ),
            const SizedBox(height: 10),
            ActionButton(
              key: const Key('auth-google-submit'),
              label: _t('google'),
              kind: ActionButtonKind.secondary,
              onPressed: canUse && repository.nativeCallbackReady
                  ? () => _run(repository.startGoogle)
                  : null,
            ),
            const SizedBox(height: 10),
            ActionButton(
              label: _t('signup'),
              kind: ActionButtonKind.tonal,
              onPressed: !_busy ? () => _open('cloud-game-signup') : null,
            ),
            TextButton(
              onPressed: !_busy ? () => _open('cloud-game-recover') : null,
              child: Text(_t('recover')),
            ),
            TextButton(
              onPressed: !_busy ? () => _open('cloud-game-confirmation') : null,
              child: Text(_t('confirmation')),
            ),
          ],
          if (mode == AuthScreenMode.signup || callbackAction) ...[
            LabeledField(
              label: _t('email'),
              controller: _email,
              enabled: canUse,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
            ),
            const SizedBox(height: 12),
          ],
          if (mode == AuthScreenMode.recover)
            TextButton(
              onPressed: !_busy
                  ? () => _open('cloud-game-legacy-recovery')
                  : null,
              child: Text(_t('legacyRecover')),
            ),
          if (mode == AuthScreenMode.legacyRecovery) ...[
            StatusNotice(message: _t('legacyHint')),
            LabeledField(
              label: _t('username'),
              controller: _username,
              enabled: canUse,
              maxLength: 24,
            ),
            const SizedBox(height: 12),
            LabeledField(
              label: _t('recoveryCode'),
              controller: _recoveryCode,
              obscureText: true,
              enabled: canUse,
              maxLength: 32,
            ),
            const SizedBox(height: 12),
          ],
          if (mode == AuthScreenMode.signup) ...[
            LabeledField(
              label: _t('username'),
              controller: _username,
              enabled: canUse,
              maxLength: 24,
            ),
            const SizedBox(height: 12),
            LabeledField(
              label: _t('displayName'),
              controller: _name,
              enabled: canUse,
            ),
            const SizedBox(height: 12),
            Text(_t('role')),
            ChoiceChips<AccountRole>(
              options: [
                for (final role in AccountRole.values)
                  ChoiceChipOption(value: role, label: _t(role.name)),
              ],
              selected: _role,
              onSelected: (value) => setState(() => _role = value),
              enabled: canUse,
            ),
            const SizedBox(height: 12),
          ],
          if (mode == AuthScreenMode.security &&
              repository.identity?.googleOnly == true)
            StatusNotice(message: _t('googleSecurity')),
          if (mode == AuthScreenMode.security &&
              repository.identity?.googleOnly != true) ...[
            LabeledField(
              label: _t('currentPassword'),
              controller: _currentPassword,
              obscureText: true,
              enabled: canUse,
            ),
            const SizedBox(height: 12),
          ],
          if (passwordMode) ...[
            LabeledField(
              label: _t('password'),
              controller: _password,
              obscureText: true,
              enabled:
                  canUse &&
                  (mode != AuthScreenMode.security ||
                      repository.identity?.googleOnly != true),
              maxLength: 128,
            ),
            const SizedBox(height: 12),
            LabeledField(
              label: _t('repeatPassword'),
              controller: _repeat,
              obscureText: true,
              enabled:
                  canUse &&
                  (mode != AuthScreenMode.security ||
                      repository.identity?.googleOnly != true),
              maxLength: 128,
            ),
            const SizedBox(height: 20),
            ActionButton(
              label: _t(
                mode == AuthScreenMode.signup ? 'signup' : 'savePassword',
              ),
              busy: _busy,
              onPressed:
                  canUse &&
                      (mode != AuthScreenMode.reset ||
                          repository.recoveryRequired) &&
                      (mode != AuthScreenMode.security ||
                          repository.identity?.googleOnly != true)
                  ? () {
                      if (_password.text != _repeat.text) {
                        setState(
                          () => _failure = const AppFailure(
                            code: FailureCode.invalid,
                            message: 'auth.invalidPassword',
                          ),
                        );
                        return;
                      }
                      _run(
                        () => switch (mode) {
                          AuthScreenMode.signup => repository.signup(
                            email: _email.text,
                            username: _username.text,
                            password: _password.text,
                            displayName: _name.text,
                            role: _role,
                          ),
                          AuthScreenMode.legacyRecovery =>
                            repository.recoverLegacy(
                              username: _username.text,
                              password: _password.text,
                              recoveryCode: _recoveryCode.text,
                            ),
                          AuthScreenMode.reset => repository.resetPassword(
                            _password.text,
                          ),
                          _ => repository.changePassword(
                            password: _password.text,
                            currentPassword: _currentPassword.text,
                          ),
                        },
                        success: mode == AuthScreenMode.signup
                            ? 'checkEmail'
                            : 'done',
                      );
                    }
                  : null,
            ),
          ],
          if (mode == AuthScreenMode.reset && !repository.recoveryRequired)
            StatusNotice(message: _t('invalidLink')),
          if (callbackAction)
            ActionButton(
              label: _t(
                mode == AuthScreenMode.recover ? 'sendRecovery' : 'resend',
              ),
              busy: _busy,
              onPressed: canUse && repository.nativeCallbackReady
                  ? () => _run(
                      () => mode == AuthScreenMode.recover
                          ? repository.requestRecovery(_email.text)
                          : repository.resendConfirmation(_email.text),
                      success: 'linkSent',
                    )
                  : null,
            ),
          if (mode == AuthScreenMode.security) ...[
            const SizedBox(height: 20),
            ActionButton(
              label: _t('sessions'),
              kind: ActionButtonKind.secondary,
              onPressed: !_busy ? () => _open('cloud-game-sessions') : null,
            ),
            for (final scope in LogoutScope.values) ...[
              const SizedBox(height: 12),
              ActionButton(
                label: _t(switch (scope) {
                  LogoutScope.local => 'logoutCurrent',
                  LogoutScope.others => 'logoutOthers',
                  LogoutScope.global => 'logoutAll',
                }),
                kind: ActionButtonKind.danger,
                onPressed: canUse && !repository.sessions.current.isGuest
                    ? () async {
                        final actor = repository.sessions.current;
                        final confirmed = await showGeoMathConfirmation(
                          context,
                          title: _t('logoutTitle'),
                          message: _t('logoutMessage'),
                          confirmLabel: _t('confirm'),
                          cancelLabel: _t('cancel'),
                          danger: true,
                        );
                        if (confirmed &&
                            mounted &&
                            repository.sessions.isCurrent(actor)) {
                          await _run(() => repository.logout(scope));
                        }
                      }
                    : null,
              ),
            ],
          ],
          if (repository.identity != null) ...[
            const SizedBox(height: 16),
            StatusNotice(message: _t('signedIn')),
            ActionButton(
              label: _t('profile'),
              onPressed: !_busy ? () => _open('cloud-game-profile') : null,
            ),
          ],
        ],
      ),
    );
  }

  @override
  void dispose() {
    widget.repository.removeListener(_changed);
    _lifecycle?.removeListener(_onLifecycle);
    unawaited(_bindings?.cancel());
    for (final controller in [
      _identifier,
      _email,
      _username,
      _name,
      _password,
      _repeat,
      _currentPassword,
      _recoveryCode,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }
}
