import 'package:flutter/material.dart';

import '../core/features/feature_contribution.dart';
import '../core/l10n/app_strings.dart';
import '../core/result.dart';
import '../core/session/actor_binding.dart';
import '../core/widgets/widgets.dart';
import '../features/auth/auth_feature.dart';
import '../features/auth/auth_services.dart';
import '../features/classroom/classroom_feature.dart';
import '../features/duel/duel_feature.dart';
import '../features/profile/profile_feature.dart';
import '../features/solo/solo_feature.dart';
import '../features/sync/sync_feature.dart';

/// Production feature registrations for the cloud/game preview.
///
/// The foundation owns bootstrap, routing, preferences, database and shared UI.
/// Each contribution supplies its own real services, routes, strings and local
/// migrations. Calling this factory creates a fresh contribution set for one
/// dependency lifetime; no preview-only transport or session is installed.
List<FeatureContribution> cloudGameFeatures() => [
  FeatureContribution(
    id: 'cloud_game_preview',
    services: [
      ServiceFactory(
        key: CloudGamePreviewServices.startup,
        createService: CloudGamePreviewStartup.new,
        dispose: (startup) => startup.dispose(),
      ),
    ],
    localizations: [
      FeatureLocalizations(
        namespace: 'cloud_game_preview',
        translations: const {
          'ms': {
            'title': 'GeoMath',
            'restoring': 'Memulihkan sesi yang disimpan pada peranti…',
            'failed': 'Sesi belum dapat dipulihkan',
            'retry': 'Cuba semula',
            'retrySession': 'Cuba lagi',
            'needsAuth': 'Sesi yang disimpan memerlukan log masuk semula. Main solo sebagai tetamu masih tersedia.',
            'guestOffline': 'Sesi yang disimpan belum dapat disahkan. Anda bermain sebagai tetamu; rekod akaun kekal berasingan.',
            'unexpected': 'Sesi belum dapat dimulakan. Sila cuba semula.',
          },
          'en': {
            'title': 'GeoMath',
            'restoring': 'Restoring the session saved on this device…',
            'failed': 'The session could not be restored',
            'retry': 'Try again',
            'retrySession': 'Retry',
            'needsAuth': 'The saved session needs a new sign-in. Guest solo play is still available.',
            'guestOffline': 'The saved session could not be verified. You are playing as a guest; account records stay separate.',
            'unexpected':
                'Session startup could not be completed. Please try again.',
          },
        },
      ),
    ],
  ),
  for (final feature in [
    authFeature(),
    profileFeature(),
    classroomFeature(),
    soloFeature(),
    duelFeature(),
    syncFeature(),
  ])
    _withStartup(feature),
];

/// Prompt 4 must await this service after bootstrap when its initial route is
/// foundation Home. The dev preview reaches it through every feature route.
abstract final class CloudGamePreviewServices {
  static const startup = ServiceKey<CloudGamePreviewStartup>(
    'cloud_game_preview.startup',
  );
}

/// Coordinates existing feature owners once per dependency lifetime.
///
/// This factory remains lazy: database/outbox bootstrap must not restore Auth or
/// resolve the sync controller before the shared record adapter exists.
final class CloudGamePreviewStartup {
  CloudGamePreviewStartup(this._services);

  final ServiceRegistry _services;
  Future<Result<void>>? _ready;
  bool _running = false;
  bool _syncStarted = false;
  bool _disposed = false;
  _StartupNotice? _notice;

  Future<Result<void>> get ready => _ready ??= _start();

  Future<Result<void>> retry() {
    if (_disposed || _services.isDisposed) return Future.value(_cancelled);
    if (_running) return ready;
    _ready = null;
    return ready;
  }

  Future<Result<void>> _start() async {
    _running = true;
    try {
      final auth = _services.get(AuthServices.repository);
      final restored = await auth.restore();
      if (_disposed || _services.isDisposed) return _cancelled;
      final code = restored.failureOrNull?.code;
      final actor = auth.sessions.current;
      // An unverified saved login never grants its owner partition. Network
      // failure must still leave offline Solo and explicit sign-in reachable.
      // The Auth owner retains protected credentials; this adapter never clears
      // them or publishes an account binding. Storage failures remain gated.
      final needsAuth =
          actor.isGuest &&
          (code == FailureCode.unauthorized || code == FailureCode.invalid);
      final guestOffline =
          actor.isGuest &&
          const {
            FailureCode.network,
            FailureCode.retryAfter,
            FailureCode.unavailable,
          }.contains(code);
      _notice = needsAuth
          ? _StartupNotice(actor, 'cloud_game_preview.needsAuth')
          : guestOffline && auth.configured
          ? _StartupNotice(
              actor,
              'cloud_game_preview.guestOffline',
              // Do not offer an immediate retry against a server cooldown.
              canRetry: code != FailureCode.retryAfter,
            )
          : null;
      if (!restored.isSuccess && !guestOffline && !needsAuth) {
        return restored;
      }
      if (!_syncStarted) {
        // Its constructor starts one scoped/coalesced wake and subscribes to
        // the existing lifecycle and verified session owner.
        _services.get(SyncServices.controller);
        _syncStarted = true;
      }
      return const Success(null);
    } catch (_) {
      return const Failed(
        AppFailure(
          code: FailureCode.unexpected,
          message: 'cloud_game_preview.unexpected',
        ),
      );
    } finally {
      _running = false;
    }
  }

  static const Result<void> _cancelled = Failed(
    AppFailure(
      code: FailureCode.cancelled,
      message: 'This app session has closed.',
    ),
  );

  void dispose() => _disposed = true;

  _StartupNotice? _takeNotice() {
    final notice = _notice;
    _notice = null;
    return notice;
  }
}

final class _StartupNotice {
  const _StartupNotice(this.actor, this.key, {this.canRetry = false});
  final ActorBinding actor;
  final String key;
  final bool canRetry;
}

FeatureContribution _withStartup(FeatureContribution feature) =>
    FeatureContribution(
      id: feature.id,
      services: feature.services,
      localizations: feature.localizations,
      migrations: feature.migrations,
      routes: [
        for (final route in feature.routes)
          FeatureRoute(
            name: route.name,
            path: route.path,
            backPolicy: route.backPolicy,
            showNavigation: route.showNavigation,
            builder: (context, services) => _CloudGameStartupGate(
              services: services,
              builder: route.builder,
            ),
          ),
      ],
    );

final class _CloudGameStartupGate extends StatefulWidget {
  const _CloudGameStartupGate({required this.services, required this.builder});

  final ServiceRegistry services;
  final Widget Function(BuildContext, ServiceRegistry) builder;

  @override
  State<_CloudGameStartupGate> createState() => _CloudGameStartupGateState();
}

final class _CloudGameStartupGateState extends State<_CloudGameStartupGate> {
  late Future<Result<void>> _ready = _startup.ready;

  CloudGamePreviewStartup get _startup =>
      widget.services.get(CloudGamePreviewServices.startup);

  void _retry() {
    final next = _startup.retry();
    setState(() {
      _ready = next;
    });
  }

  @override
  void didUpdateWidget(_CloudGameStartupGate oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(widget.services, oldWidget.services)) {
      _ready = _startup.ready;
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Result<void>>(
    future: _ready,
    builder: (context, snapshot) {
      if (snapshot.data?.isSuccess == true) {
        if (_startup._takeNotice() case final notice?) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted ||
                !widget.services
                    .get(AuthServices.repository)
                    .sessions
                    .isCurrent(notice.actor)) {
              return;
            }
            final strings = AppStrings.of(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                key: const ValueKey('cloud-game-startup-notice'),
                showCloseIcon: false,
                content: Text(strings.text(notice.key)),
                action: notice.canRetry
                    ? SnackBarAction(
                        label: strings.text('cloud_game_preview.retrySession'),
                        onPressed: () {
                          if (mounted &&
                              widget.services
                                  .get(AuthServices.repository)
                                  .sessions
                                  .isCurrent(notice.actor)) {
                            _retry();
                          }
                        },
                      )
                    : null,
              ),
            );
          });
        }
        return widget.builder(context, widget.services);
      }
      final strings = AppStrings.of(context);
      final message = snapshot.data?.failureOrNull?.message;
      return GeoMathScaffold(
        title: strings.text('cloud_game_preview.title'),
        body: snapshot.connectionState == ConnectionState.done
            ? RetryPanel(
                key: const ValueKey('cloud-game-startup-failed'),
                title: strings.text('cloud_game_preview.failed'),
                message: message == null
                    ? strings.text('cloud_game_preview.failed')
                    : strings.text(message, fallback: message),
                retryLabel: strings.text('cloud_game_preview.retry'),
                onRetry: _retry,
              )
            : StatusNotice(
                key: const ValueKey('cloud-game-startup-loading'),
                message: strings.text('cloud_game_preview.restoring'),
                liveRegion: true,
              ),
      );
    },
  );
}
