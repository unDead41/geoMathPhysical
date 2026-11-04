import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/audio/audio_coordinator.dart';
import '../../core/lifecycle/app_lifecycle.dart';
import '../../core/module/module_host_bridge.dart';
import '../../core/navigation/app_navigation.dart';
import '../../core/preferences/app_preferences.dart';
import '../../core/preferences/preferences_repository.dart';
import '../../core/result.dart';
import '../../core/runtime/random_source.dart';
import '../../core/session/auth_session.dart';
import 'module_asset_repository.dart';

enum ModuleLoadPhase { verifying, loading, ready, failed, closed }

/// The production Android adapter: a real WebView loading only verified local
/// assets. It has no mock WebView or network fallback.
final class ModuleSpikeController extends ChangeNotifier {
  ModuleSpikeController({
    required this.sessions,
    required this.lifecycle,
    required this.preferences,
    required this.audio,
    ModuleAssetRepository? assets,
    this.onCommand,
    RandomSource? random,
  }) : assets = assets ?? ModuleAssetRepository() {
    final source = random ?? SecureRandomSource();
    bridge = ModuleHostBridge(
      sessions: sessions,
      lifecycle: lifecycle,
      instanceId: randomIdentifier(source),
      bridgeSession: randomIdentifier(source),
      progressSession: randomIdentifier(source),
      allowedNavigationRoutes: const {'/help', '/settings'},
    );
    _documentId = randomIdentifier(source);
    _audioLease = audio.register(
      owner: 'module:${bridge.identity.instanceId}',
      endpoint: _ModuleAudioEndpoint(this),
    );
    bridge.addListener(_bridgeChanged);
    preferences.addListener(_preferencesChanged);
    lifecycle.addListener(_lifecycleChanged);
  }

  static const trustedAssetUrl =
      'file:///android_asset/flutter_assets/assets/module/index.html';
  final AuthSession sessions;
  final AppLifecycleController lifecycle;
  final PreferencesRepository preferences;
  final AudioCoordinator audio;
  final ModuleAssetRepository assets;
  final Future<void> Function(ModuleCommand)? onCommand;
  late final ModuleHostBridge bridge;
  late final String _documentId;
  late final AudioLease _audioLease;
  final _ready = Completer<Result<ModuleCommand>>();
  WebViewController? _webViewController;
  ModuleLoadPhase _phase = ModuleLoadPhase.verifying;
  AppFailure? _failure;
  ModuleCommand? _lastValidatedCommand;
  int _acceptedCommandCount = 0;
  bool _started = false;
  bool _configured = false;
  bool _disposed = false;
  bool _routeVisible = true;
  bool _audioAllowed = false;
  Brightness _brightness = Brightness.light;
  String? _currentTopLevelUrl;
  Timer? _handshakeTimer;

  WebViewController? get webViewController => _webViewController;
  ModuleLoadPhase get phase => _phase;
  AppFailure? get failure => _failure;
  ModuleCommand? get lastValidatedCommand => _lastValidatedCommand;
  int get acceptedCommandCount => _acceptedCommandCount;
  Future<Result<ModuleCommand>> get ready => _ready.future;

  Future<void> initialize() async {
    if (_started || _disposed) return;
    _started = true;
    final checked = await assets.verify();
    if (_disposed) return;
    if (checked case Failed<VerifiedModuleAssets>(:final failure)) {
      _fail(failure);
      return;
    }
    if (defaultTargetPlatform != TargetPlatform.android ||
        WebViewPlatform.instance == null) {
      _fail(
        const AppFailure(
          code: FailureCode.unavailable,
          message: 'This learning module requires the Android WebView runtime.',
        ),
      );
      return;
    }
    if (bridge.status == ModuleBridgeStatus.closed) return;
    try {
      final controller = WebViewController();
      _webViewController = controller;
      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await controller.addJavaScriptChannel(
        'GeoMathNative',
        onMessageReceived: (message) => unawaited(_receive(message.message)),
      );
      await controller.setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            if (_disposed) return NavigationDecision.prevent;
            if (request.isMainFrame) {
              return request.url == trustedAssetUrl && !_configured
                  ? NavigationDecision.navigate
                  : NavigationDecision.prevent;
            }
            return request.url == 'about:srcdoc' ||
                    request.url.startsWith('about:srcdoc#') ||
                    request.url == 'about:blank'
                ? NavigationDecision.navigate
                : NavigationDecision.prevent;
          },
          onPageStarted: (url) {
            _currentTopLevelUrl = url;
            if (url != trustedAssetUrl) _untrustedNavigation();
          },
          onPageFinished: (url) => unawaited(_configure(url)),
          onUrlChange: (change) {
            if (change.url != null && change.url != trustedAssetUrl) {
              _untrustedNavigation();
            }
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true) {
              _fail(
                const AppFailure(
                  code: FailureCode.unavailable,
                  message: 'The local learning document could not be opened.',
                ),
              );
            }
          },
        ),
      );
      if (_disposed) return;
      bridge.attachDocument(_documentId);
      _phase = ModuleLoadPhase.loading;
      notifyListeners();
      _startHandshakeTimer();
      await controller.loadFlutterAsset(ModuleAssetRepository.entryPoint);
    } catch (_) {
      _fail(
        const AppFailure(
          code: FailureCode.unavailable,
          message: 'The Android learning WebView could not start.',
        ),
      );
    }
  }

  Future<void> _configure(String url) async {
    if (_disposed ||
        _configured ||
        url != trustedAssetUrl ||
        bridge.status == ModuleBridgeStatus.closed) {
      return;
    }
    final controller = _webViewController;
    if (controller == null ||
        await controller.currentUrl() != trustedAssetUrl) {
      return;
    }
    if (_disposed || _configured) return;
    _currentTopLevelUrl = url;
    final data = <String, Object>{
      'instanceId': bridge.identity.instanceId,
      'bridgeSession': bridge.identity.bridgeSession,
      'progressSession': bridge.progressSession,
      'theme': _theme,
      'settings': _settings,
      'progress': <Object>[],
    };
    try {
      final result = await controller.runJavaScriptReturningResult(
        'window.GeoMathModule.configure(${jsonEncode(data)})',
      );
      if (result != true && result != 'true') {
        throw StateError('Trusted wrapper configuration rejected.');
      }
      _configured = true;
      await _syncActive();
    } catch (_) {
      _fail(
        const AppFailure(
          code: FailureCode.unavailable,
          message: 'The trusted learning wrapper could not be configured.',
        ),
      );
    }
  }

  Future<void> _receive(String encoded) async {
    if (_disposed || _currentTopLevelUrl != trustedAssetUrl) return;
    final controller = _webViewController;
    if (controller == null ||
        await controller.currentUrl() != trustedAssetUrl ||
        _disposed) {
      return;
    }
    // Android's JavaScriptChannel has no frame metadata. Proof is the wrapper
    // capability held only in its closure, plus this pinned native document;
    // the source-validated opaque child never receives that capability.
    final result = bridge.receive(
      encoded,
      context: ModuleMessageContext(
        documentId: _documentId,
        isTrustedDocument: _currentTopLevelUrl == trustedAssetUrl,
        sourceProof: ModuleSourceProof.wrapperCapability,
      ),
    );
    if (result case Success<ModuleCommand>(:final value)) {
      _lastValidatedCommand = value;
      _acceptedCommandCount++;
      if (value.kind == ModuleCommandKind.ready) {
        _phase = ModuleLoadPhase.ready;
        _handshakeTimer?.cancel();
        if (!_ready.isCompleted) _ready.complete(Success(value));
        if (_routeVisible) {
          unawaited(_audioLease.activate().catchError((Object _) {}));
        }
      }
      notifyListeners();
      await onCommand?.call(value);
    }
  }

  String get _theme =>
      preferences.value.theme == AppTheme.dark ||
          (preferences.value.theme == AppTheme.system &&
              _brightness == Brightness.dark)
      ? 'dark'
      : 'light';

  Map<String, Object> get _settings => {
    'language': preferences.value.language.name,
    'textSize': (preferences.value.textScale * 100).round(),
    'motionPaused': preferences.value.reducedMotion,
    'contrast': preferences.value.strongContrast ? 'strong' : 'standard',
    'audioEnabled': preferences.value.soundEnabled && _audioAllowed,
  };

  /// Theme/media changes update presentation through the existing settings v1
  /// bridge. Neither document, camera, dimensions nor unfolding is reloaded.
  void updateBrightness(Brightness brightness) {
    if (brightness == _brightness) return;
    _brightness = brightness;
    _preferencesChanged();
  }

  void _preferencesChanged() {
    if (!_configured || _disposed) return;
    unawaited(
      _run(
        'window.GeoMathModule.updatePreferences(${jsonEncode({'theme': _theme, 'settings': _settings})})',
      ),
    );
  }

  /// Root navigation can cover the module without destroying its activity.
  void setRouteVisible(bool value) {
    if (_routeVisible == value) return;
    _routeVisible = value;
    _startHandshakeTimer();
    unawaited(_syncActive());
    if (_phase == ModuleLoadPhase.ready) {
      unawaited(
        (value ? _audioLease.activate() : _audioLease.deactivate()).catchError(
          (Object _) {},
        ),
      );
    }
  }

  void _lifecycleChanged() {
    _startHandshakeTimer();
    unawaited(_syncActive());
  }

  void _startHandshakeTimer() {
    _handshakeTimer?.cancel();
    _handshakeTimer = null;
    if (_phase != ModuleLoadPhase.loading ||
        !lifecycle.isForeground ||
        !_routeVisible) {
      return;
    }
    _handshakeTimer = Timer(const Duration(seconds: 30), () {
      if (_phase != ModuleLoadPhase.ready) {
        _fail(
          const AppFailure(
            code: FailureCode.unavailable,
            message: 'The local learning module did not finish its secure handshake.',
          ),
        );
      }
    });
  }

  Future<void> _syncActive() => _run(
    'window.GeoMathModule.setActive(${lifecycle.isForeground && _routeVisible})',
  );

  Future<void> _run(String script) async {
    final controller = _webViewController;
    if (!_configured ||
        _disposed ||
        controller == null ||
        _currentTopLevelUrl != trustedAssetUrl) {
      return;
    }
    try {
      await controller.runJavaScript(script);
    } catch (_) {
      // A disposed platform view cannot deliver new commands. It is never
      // treated as a successful preference or persistence acknowledgement.
    }
  }

  Future<void> _setAudioAllowed(bool allowed) async {
    _audioAllowed = allowed;
    final controller = _webViewController;
    if (!_configured ||
        _disposed ||
        controller == null ||
        _phase != ModuleLoadPhase.ready) {
      return;
    }
    await controller.runJavaScript(
      'window.GeoMathModule.updatePreferences(${jsonEncode({'theme': _theme, 'settings': _settings})})',
    );
    final revision = await controller.runJavaScriptReturningResult(
      'window.GeoMathModule.setAudioAllowed($allowed)',
    );
    final expected = int.tryParse(revision.toString());
    if (expected == null || expected < 1) {
      throw StateError('Audio gate unavailable.');
    }
    for (var attempt = 0; attempt < 50; attempt++) {
      if (_disposed || _phase != ModuleLoadPhase.ready) return;
      final raw = await controller.runJavaScriptReturningResult(
        'window.GeoMathModule.diagnostics().audioAck',
      );
      if (int.tryParse(raw.toString()) == expected) return;
      await Future<void>.delayed(const Duration(milliseconds: 40));
    }
    throw StateError('The learning audio stop/grant was not acknowledged.');
  }

  void _bridgeChanged() {
    if (_disposed || bridge.status != ModuleBridgeStatus.closed) return;
    if (_phase != ModuleLoadPhase.failed) _phase = ModuleLoadPhase.closed;
    _handshakeTimer?.cancel();
    unawaited(_run('window.GeoMathModule.dispose()'));
    unawaited(_audioLease.deactivate().catchError((Object _) {}));
    if (!_ready.isCompleted) {
      _ready.complete(
        const Failed(
          AppFailure(
            code: FailureCode.stale,
            message: 'The learning session has ended.',
          ),
        ),
      );
    }
    notifyListeners();
  }

  void _untrustedNavigation() {
    _currentTopLevelUrl = null;
    _fail(
      const AppFailure(
        code: FailureCode.unauthorized,
        message: 'Navigation outside the trusted offline module was blocked.',
      ),
    );
  }

  void _fail(AppFailure failure) {
    if (_disposed || _phase == ModuleLoadPhase.failed) return;
    _failure = failure;
    _phase = ModuleLoadPhase.failed;
    _handshakeTimer?.cancel();
    if (!_ready.isCompleted) _ready.complete(Failed(failure));
    bridge.close();
    notifyListeners();
  }

  @override
  void dispose() {
    if (_disposed) return;
    preferences.removeListener(_preferencesChanged);
    lifecycle.removeListener(_lifecycleChanged);
    bridge.removeListener(_bridgeChanged);
    unawaited(_audioLease.release().catchError((Object _) {}));
    unawaited(_run('window.GeoMathModule.dispose()'));
    bridge.dispose();
    _disposed = true;
    _handshakeTimer?.cancel();
    if (!_ready.isCompleted) {
      _ready.complete(
        const Failed(
          AppFailure(
            code: FailureCode.cancelled,
            message: 'The learning view was closed.',
          ),
        ),
      );
    }
    super.dispose();
  }
}

final class _ModuleAudioEndpoint implements AudioEndpoint {
  const _ModuleAudioEndpoint(this.controller);
  final ModuleSpikeController controller;
  @override
  Future<void> setPlaybackAllowed(bool allowed) =>
      controller._setAudioAllowed(allowed);
  @override
  Future<void> dispose() async {}
}

/// Foundation spike screen, not a claim that every learning flow is complete.
final class ModuleSpikeScreen extends StatefulWidget {
  const ModuleSpikeScreen({
    super.key,
    required this.sessions,
    required this.lifecycle,
    required this.preferences,
    required this.audio,
    this.onCommand,
    this.assets,
    this.controller,
    this.embedded = false,
  });
  final AuthSession sessions;
  final AppLifecycleController lifecycle;
  final PreferencesRepository preferences;
  final AudioCoordinator audio;
  final Future<void> Function(ModuleCommand)? onCommand;
  final ModuleAssetRepository? assets;
  final ModuleSpikeController? controller;
  final bool embedded;

  @override
  State<ModuleSpikeScreen> createState() => _ModuleSpikeScreenState();
}

final class _ModuleSpikeScreenState extends State<ModuleSpikeScreen> {
  late final ModuleSpikeController _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        widget.controller ??
        ModuleSpikeController(
          sessions: widget.sessions,
          lifecycle: widget.lifecycle,
          preferences: widget.preferences,
          audio: widget.audio,
          assets: widget.assets,
          onCommand: widget.onCommand,
        );
    unawaited(_controller.initialize());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller.updateBrightness(Theme.of(context).brightness);
    _controller.setRouteVisible(
      AppRouteScope.maybeOf(context)?.isCurrent ?? true,
    );
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: Listenable.merge([_controller, widget.preferences]),
    builder: (context, _) {
      final english = widget.preferences.value.language == AppLanguage.en;
      final body = switch (_controller.phase) {
        ModuleLoadPhase.failed => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: SelectableText(
              english
                  ? 'The offline learning module is unavailable. ${_controller.failure?.message ?? ''}'
                  : 'Modul pembelajaran luar talian tidak tersedia. Semak pemasangan aplikasi yang sah.',
            ),
          ),
        ),
        ModuleLoadPhase.closed => Center(
          child: Text(
            english
                ? 'This learning session has ended. Reopen the module.'
                : 'Sesi pembelajaran ini telah tamat. Buka semula modul.',
          ),
        ),
        ModuleLoadPhase.verifying => Center(
          child: Semantics(
            label: english
                ? 'Verifying offline assets'
                : 'Mengesahkan aset luar talian',
            child: const CircularProgressIndicator(),
          ),
        ),
        ModuleLoadPhase.loading || ModuleLoadPhase.ready => Stack(
          children: [
            if (_controller.webViewController case final controller?)
              WebViewWidget(
                key: const ValueKey('canonical-module-webview'),
                controller: controller,
              ),
            if (_controller.phase == ModuleLoadPhase.loading)
              const Align(
                alignment: Alignment.topCenter,
                child: LinearProgressIndicator(),
              ),
          ],
        ),
      };
      if (widget.embedded) return body;
      return Scaffold(
        appBar: AppBar(
          title: Text(english ? 'Explore geometry' : 'Teroka geometri'),
        ),
        body: body,
      );
    },
  );

  @override
  void dispose() {
    if (widget.controller == null) _controller.dispose();
    super.dispose();
  }
}
