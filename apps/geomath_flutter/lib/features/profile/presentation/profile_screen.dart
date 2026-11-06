import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/navigation/app_navigation.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/widgets/widgets.dart';
import '../../auth/data/auth_repository.dart';
import '../data/profile_repository.dart';
import '../data/profile_drafts.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.repository,
    required this.drafts,
    this.onDispose,
  });
  final ProfileRepository repository;
  final ProfileDrafts drafts;
  final VoidCallback? onDispose;
  @override
  State<ProfileScreen> createState() => ProfileScreenState();
}

class ProfileScreenState extends State<ProfileScreen> {
  final _name = TextEditingController();
  final _username = TextEditingController();
  final _nameFocus = FocusNode(debugLabel: 'profile-name');
  final _usernameFocus = FocusNode(debugLabel: 'profile-username');
  AccountProfile? _profile;
  AccountRole _role = AccountRole.student;
  String _avatar = 'initial';
  bool _busy = false;
  bool _saving = false;
  bool _loaded = false;
  bool _saved = false;
  bool _unknownOutcome = false;
  bool _attemptedSave = false;
  AppFailure? _failure;
  int _generation = 0;
  late ActorBinding _actor;
  StreamSubscription<ActorBinding>? _bindings;
  bool get dirty =>
      _name.text != (_profile?.displayName ?? '') ||
      _avatar != (_profile?.avatar ?? 'initial') ||
      _profile == null &&
          (_username.text.isNotEmpty || _role != AccountRole.student);
  @override
  void initState() {
    super.initState();
    _actor = widget.repository.sessions.current;
    _bindings = widget.repository.sessions.bindings.listen((actor) {
      if (_actor == actor) return;
      ++_generation;
      _actor = actor;
      _name.clear();
      _username.clear();
      _profile = null;
      _avatar = 'initial';
      _role = AccountRole.student;
      _loaded = false;
      _saved = false;
      _busy = false;
      _saving = false;
      _failure = null;
      _unknownOutcome = false;
      _attemptedSave = false;
      if (mounted) setState(() {});
      if (!actor.isGuest) unawaited(_load());
    });
    final retained = widget.drafts.read(_actor);
    if (retained != null && !_actor.isGuest) {
      _name.text = retained.name;
      _username.text = retained.username;
      _avatar = retained.avatar;
      _role = retained.role;
      _profile = retained.base;
      _unknownOutcome = retained.unknownOutcome;
      _loaded = true;
    } else if (!_actor.isGuest) {
      unawaited(_load());
    }
  }

  String _t(String key) =>
      AppStrings.of(context).text(key.contains('.') ? key : 'profile.$key');
  void _discard() => setState(() {
    _name.text = _profile?.displayName ?? '';
    _username.text = _profile?.username ?? '';
    _avatar = _profile?.avatar ?? 'initial';
    _role = _profile?.role ?? AccountRole.student;
    _saved = false;
    _failure = null;
    _attemptedSave = false;
    widget.drafts.save(_actor, null);
  });
  Future<void> _load({bool preserveDraft = false}) async {
    if (_busy) return;
    final actor = _actor;
    final generation = ++_generation;
    setState(() {
      _busy = true;
      _failure = null;
      _saved = false;
    });
    final result = await widget.repository.load(actor);
    if (!mounted ||
        generation != _generation ||
        !widget.repository.sessions.isCurrent(actor)) {
      return;
    }
    setState(() {
      _busy = false;
      _failure = result.failureOrNull;
      if (result.isSuccess) {
        _profile = result.valueOrNull;
        _loaded = true;
        _unknownOutcome = false;
        if (!preserveDraft) {
          _name.text = _profile?.displayName ?? '';
          _username.text = _profile?.username ?? '';
          _avatar = _profile?.avatar ?? 'initial';
          _role = _profile?.role ?? AccountRole.student;
        }
      }
    });
  }

  Future<bool> _save() async {
    if (_busy || !_loaded || _unknownOutcome) return false;
    if (!AccountValidation.validDisplayName(_name.text) ||
        _profile == null && !AccountValidation.validUsername(_username.text)) {
      setState(() {
        _attemptedSave = true;
        _failure = null;
        _saved = false;
      });
      if (!AccountValidation.validDisplayName(_name.text)) {
        _nameFocus.requestFocus();
      } else {
        _usernameFocus.requestFocus();
      }
      return false;
    }
    final actor = _actor;
    final generation = ++_generation;
    setState(() {
      _busy = true;
      _failure = null;
      _saved = false;
      _saving = true;
    });
    final result = _profile == null
        ? await widget.repository.complete(
            actor,
            username: _username.text,
            displayName: _name.text,
            role: _role,
          )
        : await widget.repository.update(
            actor,
            displayName: _name.text,
            avatar: _avatar,
          );
    if (!mounted ||
        generation != _generation ||
        !widget.repository.sessions.isCurrent(actor)) {
      return false;
    }
    setState(() {
      _busy = false;
      _saving = false;
      _failure = result.failureOrNull;
      if (result case Success<AccountProfile>(:final value)) {
        _profile = value;
        _name.text = value.displayName;
        _username.text = value.username;
        _avatar = value.avatar;
        _role = value.role;
        _saved = true;
        _attemptedSave = false;
        widget.drafts.save(_actor, null);
      } else if (result.failureOrNull?.code == FailureCode.network ||
          result.failureOrNull?.message == 'profile.invalidResponse') {
        // A 2xx write with an unverifiable profile can already have committed.
        // Require an explicit snapshot before the user can send another write.
        _unknownOutcome = true;
      }
    });
    return result.isSuccess;
  }

  Future<BackDecision> requestLeave() async {
    if (_busy) return BackDecision.stay;
    if (!dirty) return BackDecision.allow;
    final actor = _actor;
    final generation = _generation;
    final choice = await showUnsavedChangesDialog(
      context,
      title: _t('unsavedTitle'),
      message: _t('unsavedMessage'),
      saveLabel: _t('save'),
      discardLabel: _t('discard'),
      stayLabel: _t('stay'),
    );
    if (!mounted ||
        !widget.repository.sessions.isCurrent(actor) ||
        generation != _generation) {
      return BackDecision.stay;
    }
    if (choice == UnsavedChangesChoice.discard) {
      _discard();
      return BackDecision.allow;
    }
    return switch (choice) {
      UnsavedChangesChoice.save =>
        await _save() ? BackDecision.allow : BackDecision.stay,
      UnsavedChangesChoice.discard => BackDecision.allow,
      UnsavedChangesChoice.stay => BackDecision.stay,
    };
  }

  @override
  Widget build(BuildContext context) {
    final guest = _actor.isGuest;
    final enabled = !_busy && _loaded && !_unknownOutcome;
    return GeoMathScaffold(
      title: _t('title'),
      maxWidth: 640,
      showBackButton: true,
      onBack: () => AppScope.of(context).router.back(),
      actions: [
        IconButton(
          key: const Key('profile-settings'),
          tooltip: _t('settings'),
          icon: const Icon(Icons.tune_rounded),
          onPressed: () => AppScope.of(context).router.open('preferences'),
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
        ),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (guest) ...[
            SectionHeader(title: _t('guest'), subtitle: _t('guestNote')),
            const SizedBox(height: 16),
            if (!widget.repository.configured)
              StatusNotice(
                key: const Key('profile-unavailable'),
                message: _t('unavailable'),
              ),
            if (widget.repository.configured) ...[
              ActionButton(
                key: const Key('profile-login'),
                label: _t('login'),
                onPressed: () =>
                    AppScope.of(context).router.open('cloud-game-login'),
              ),
              const SizedBox(height: 12),
              ActionButton(
                key: const Key('profile-signup'),
                label: _t('signup'),
                kind: ActionButtonKind.secondary,
                onPressed: () =>
                    AppScope.of(context).router.open('cloud-game-signup'),
              ),
            ],
          ] else ...[
            if (_busy && !_saving)
              StatusNotice(
                key: const Key('profile-loading'),
                liveRegion: true,
                message: _t('loading'),
              ),
            if (!_loaded && !_busy && _failure != null)
              RetryPanel(
                key: const Key('profile-load-error'),
                title: _t('loadFailed'),
                message: _t(_failure!.message),
                retryLabel: _t('retry'),
                onRetry: _load,
              ),
            if (_loaded) ...[
              if (_failure case final failure?)
                StatusNotice(
                  key: const Key('profile-error'),
                  tone: StatusTone.error,
                  liveRegion: true,
                  message: _t(failure.message),
                ),
              if (_unknownOutcome)
                StatusNotice(
                  tone: StatusTone.warning,
                  message: _t('unknownOutcome'),
                  liveRegion: true,
                ),
              if (_saved)
                StatusNotice(
                  tone: StatusTone.success,
                  message: _t('saved'),
                  liveRegion: true,
                ),
              if (_profile == null)
                SectionHeader(title: _t('complete'), subtitle: _t('roleNote')),
              if (_profile != null)
                SectionHeader(
                  title: _profile!.username,
                  subtitle: '${_t('role')}: ${_t(_profile!.role.name)}',
                ),
              const SizedBox(height: 16),
              if (dirty && !_unknownOutcome) ...[
                StatusNotice(
                  key: const Key('profile-draft'),
                  message: _t('draftNote'),
                  tone: StatusTone.neutral,
                ),
                const SizedBox(height: 16),
              ],
              LabeledField(
                key: const Key('profile-name'),
                label: _t('name'),
                controller: _name,
                focusNode: _nameFocus,
                enabled: enabled,
                helperText: _t('nameHint'),
                errorText:
                    _attemptedSave &&
                        !AccountValidation.validDisplayName(_name.text)
                    ? _t('nameInvalid')
                    : null,
                autofillHints: const [AutofillHints.name],
                textInputAction: _profile == null
                    ? TextInputAction.next
                    : TextInputAction.done,
                onChanged: (_) => setState(() {
                  _saved = false;
                  _failure = null;
                }),
              ),
              if (_profile == null) ...[
                const SizedBox(height: 12),
                LabeledField(
                  key: const Key('profile-username'),
                  label: _t('username'),
                  controller: _username,
                  focusNode: _usernameFocus,
                  enabled: enabled,
                  maxLength: 24,
                  helperText: _t('usernameHint'),
                  errorText: _failure?.message == 'profile.usernameTaken'
                      ? _t('usernameTaken')
                      : _attemptedSave &&
                            !AccountValidation.validUsername(_username.text)
                      ? _t('usernameInvalid')
                      : null,
                  autofillHints: const [AutofillHints.newUsername],
                  textInputAction: TextInputAction.done,
                  onChanged: (_) => setState(() {
                    _saved = false;
                    _failure = null;
                  }),
                ),
                Text(_t('role')),
                ChoiceChips<AccountRole>(
                  options: [
                    for (final role in AccountRole.values)
                      ChoiceChipOption(value: role, label: _t(role.name)),
                  ],
                  selected: _role,
                  onSelected: (value) => setState(() => _role = value),
                  enabled: enabled,
                ),
              ],
              if (_profile != null) ...[
                const SizedBox(height: 16),
                Text(_t('avatar')),
                ChoiceChips<String>(
                  options: [
                    for (final avatar in ProfileRepository.avatars)
                      ChoiceChipOption(value: avatar, label: _t(avatar)),
                  ],
                  selected: _avatar,
                  enabled: enabled,
                  onSelected: (value) => setState(() {
                    _avatar = value;
                    _saved = false;
                  }),
                ),
              ],
              const SizedBox(height: 20),
              ActionButton(
                key: const Key('profile-save'),
                label: _t('save'),
                busy: _saving,
                onPressed: enabled && (dirty || _profile == null)
                    ? _save
                    : null,
              ),
              const SizedBox(height: 12),
              ActionButton(
                key: const Key('profile-discard'),
                label: _t('discard'),
                kind: ActionButtonKind.secondary,
                onPressed: !_busy && dirty ? _discard : null,
              ),
              const SizedBox(height: 12),
              ActionButton(
                key: const Key('profile-refresh'),
                label: _t('refresh'),
                busy: _busy && !_saving,
                busyLabel: _t('loading'),
                kind: ActionButtonKind.tonal,
                onPressed: !_busy ? () => _load(preserveDraft: dirty) : null,
              ),
            ],
            const SizedBox(height: 20),
            ActionButton(
              key: const Key('profile-security'),
              label: _t('security'),
              kind: ActionButtonKind.secondary,
              onPressed: !_busy
                  ? () =>
                        AppScope.of(context).router.open('cloud-game-security')
                  : null,
            ),
          ],
        ],
      ),
    );
  }

  @override
  void dispose() {
    if (dirty && widget.repository.sessions.isCurrent(_actor)) {
      widget.drafts.save(
        _actor,
        ProfileDraft(
          name: _name.text,
          username: _username.text,
          avatar: _avatar,
          role: _role,
          base: _profile,
          unknownOutcome: _unknownOutcome || _saving,
        ),
      );
    } else {
      widget.drafts.save(_actor, null);
    }
    widget.onDispose?.call();
    ++_generation;
    unawaited(_bindings?.cancel());
    _name.dispose();
    _username.dispose();
    _nameFocus.dispose();
    _usernameFocus.dispose();
    super.dispose();
  }
}
