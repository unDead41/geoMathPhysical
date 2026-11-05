import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/result.dart';
import '../../../core/session/actor_binding.dart';
import '../../../core/widgets/widgets.dart';
import '../data/auth_repository.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key, required this.repository});
  final AuthRepository repository;
  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  SecuritySessions? _value;
  AppFailure? _failure;
  bool _busy = false;
  int _generation = 0;
  StreamSubscription<ActorBinding>? _bindings;
  @override
  void initState() {
    super.initState();
    _bindings = widget.repository.sessions.bindings.listen((_) {
      ++_generation;
      if (mounted) {
        setState(() {
          _value = null;
          _failure = null;
          _busy = false;
        });
      }
    });
    unawaited(_load());
  }

  Future<void> _load() async {
    if (_busy) return;
    final generation = ++_generation;
    final actor = widget.repository.sessions.current;
    setState(() {
      _busy = true;
      _failure = null;
    });
    final result = await widget.repository.securitySessions();
    if (!mounted ||
        generation != _generation ||
        !widget.repository.sessions.isCurrent(actor)) {
      return;
    }
    setState(() {
      _busy = false;
      _failure = result.failureOrNull;
      _value = result.valueOrNull;
    });
  }

  String _t(String key) =>
      AppStrings.of(context).text(key.startsWith('auth.') ? key : 'auth.$key');
  String _deviceLabel(String? value) {
    final ua = value ?? '';
    final device = RegExp(r'iPad|Tablet', caseSensitive: false).hasMatch(ua)
        ? _t('tablet')
        : RegExp(r'Mobile|iPhone|Android', caseSensitive: false).hasMatch(ua)
        ? _t('phoneDevice')
        : RegExp(
            r'Windows|Macintosh|Linux|X11',
            caseSensitive: false,
          ).hasMatch(ua)
        ? _t('computer')
        : _t('unknownDevice');
    final browser = ua.contains('SamsungBrowser/')
        ? 'Samsung Internet'
        : RegExp(r'Edg(?:e|A|iOS)?/').hasMatch(ua)
        ? 'Edge'
        : RegExp(r'OPR/|Opera').hasMatch(ua)
        ? 'Opera'
        : RegExp(r'Firefox/|FxiOS/').hasMatch(ua)
        ? 'Firefox'
        : RegExp(r'Chrome/|CriOS/').hasMatch(ua)
        ? 'Chrome'
        : RegExp(r'Version/.+Safari/').hasMatch(ua)
        ? 'Safari'
        : _t('unknownBrowser');
    return '$device · $browser';
  }

  @override
  Widget build(BuildContext context) => GeoMathScaffold(
    title: _t('sessions'),
    showBackButton: true,
    onBack: () => AppScope.of(context).router.back(),
    body: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StatusNotice(message: _t('sessionScope')),
        Text(_t('deviceEstimate')),
        const SizedBox(height: 16),
        ActionButton(
          label: _t('refresh'),
          busy: _busy,
          onPressed: _busy ? null : _load,
        ),
        if (_failure case final failure?)
          StatusNotice(tone: StatusTone.error, message: _t(failure.message)),
        if (_value case final value?) ...[
          const SizedBox(height: 16),
          Text('${_t('serverTime')}: ${value.serverNow.toLocal()}'),
          for (final row in [
            ...value.rows.where((row) => row.isCurrent),
            ...value.rows.where((row) => !row.isCurrent),
          ])
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: GeoMathCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _t(row.isCurrent ? 'current' : row.status),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(_deviceLabel(row.userAgent)),
                    if (row.startedAt != null)
                      Text(row.startedAt!.toLocal().toString()),
                  ],
                ),
              ),
            ),
          if (value.truncated) StatusNotice(message: _t('truncated')),
        ],
      ],
    ),
  );
  @override
  void dispose() {
    ++_generation;
    unawaited(_bindings?.cancel());
    _value = null;
    super.dispose();
  }
}
