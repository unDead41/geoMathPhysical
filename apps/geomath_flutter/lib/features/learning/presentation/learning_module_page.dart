import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../app/app_dependencies.dart';
import '../../../core/design/face_palette.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../core/navigation/app_navigation.dart';
import '../../../core/widgets/widgets.dart';
import '../application/learning_module_controller.dart';
import '../application/learning_services.dart';
import '../module_spike_host.dart';
import '../persistence/learning_reflection_controller.dart';

/// Native shell and navigation around the actual canonical activity. The same
/// platform document survives presentation changes and covered routes.
class LearningModulePage extends StatefulWidget {
  const LearningModulePage({
    super.key,
    required this.section,
    required this.titleKey,
    this.initialShape = 'cube',
    this.mode,
    this.header,
  });
  final String section;
  final String titleKey;
  final String initialShape;
  final String? mode;
  final Widget? header;
  @override
  State<LearningModulePage> createState() => _LearningModulePageState();
}

class _LearningModulePageState extends State<LearningModulePage> {
  LearningModuleController? _controller;
  late LearningReflectionController _reflections;
  LearningBackCoordinator? _back;
  int? _routeInstance;
  String _selectedView = 'front';
  bool _nativeSheetOpen = false;
  bool _routeSeedConsumed = false;
  StreamSubscription<Object?>? _actorSubscription;
  BuildContext? _nativeDialogContext;
  bool get english => AppStrings.of(context).locale.languageCode == 'en';
  String text(String ms, String en) => english ? en : ms;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= _createController();
    _controller!.updateBrightness(Theme.of(context).brightness);
    _controller!.setVisible(AppRouteScope.maybeOf(context)?.isCurrent ?? true);
  }

  LearningModuleController _createController({
    Map<String, Object?>? recoverySeed,
  }) {
    final app = AppScope.of(context);
    final services = app.dependencies.composition.services;
    _actorSubscription ??= app.dependencies.sessions.bindings.listen((_) {
      if (_controller?.isCurrent != false) return;
      final dialog = _nativeDialogContext;
      if (dialog != null &&
          dialog.mounted &&
          ModalRoute.of(dialog)?.isCurrent == true) {
        Navigator.pop(dialog);
      }
    });
    final arguments =
        AppRouteScope.maybeOf(context)?.entry.arguments ??
        const <String, Object?>{};
    final rawSeed =
        !_routeSeedConsumed &&
            arguments['checkpointActor'] == app.dependencies.sessions.current
        ? arguments['checkpoint']
        : null;
    _routeSeedConsumed = true;
    _back = services.get(learningBackCoordinatorKey);
    _routeInstance = AppRouteScope.maybeOf(context)?.entry.instance;
    if (_routeInstance case final instance?) {
      _back!.register(instance, _guardLeave);
    }
    _reflections = services.get(learningReflectionControllerKey);
    final controller = LearningModuleController(
      sessions: app.dependencies.sessions,
      lifecycle: app.dependencies.lifecycle,
      preferences: app.dependencies.preferences,
      audio: app.dependencies.audio,
      checkpoints: services.get(learningCheckpointRepositoryKey),
      reflections: _reflections,
      section: widget.section,
      initialShape: widget.initialShape,
      mode: widget.mode,
      initialCheckpoint:
          recoverySeed ??
          switch (rawSeed) {
            Map value => Map<String, Object?>.from(value),
            _ => null,
          },
      onNavigate: (route) {
        if (mounted) app.router.open(route);
      },
      onExport: (svg) => unawaited(_showNativeContent(svg, isSvg: true)),
      onExternalLink: (url) => unawaited(_showNativeContent(url, isSvg: false)),
      onWorkflow: (section, checkpoint) {
        if (!mounted ||
            _controller?.isCurrent != true ||
            AppRouteScope.maybeOf(context)?.isCurrent != true) {
          return;
        }
        final route = 'learning-$section';
        if (!app.dependencies.composition.routes.contains(route)) return;
        final explore = checkpoint['explore'];
        final shape = explore is Map ? explore['shape'] : null;
        app.router.open(
          route,
          arguments: {
            'shapeId': shape is String ? shape : widget.initialShape,
            'checkpoint': checkpoint,
            'checkpointActor': _controller!.actor,
          },
        );
      },
    );
    unawaited(controller.initialize());
    return controller;
  }

  Future<void> _showNativeContent(String content, {required bool isSvg}) async {
    if (!mounted || _nativeSheetOpen) return;
    _nativeSheetOpen = true;
    try {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          _nativeDialogContext = dialogContext;
          return AlertDialog(
            title: Text(
              isSvg
                  ? text('Eksport bentangan SVG', 'Export SVG net')
                  : text('Pautan rujukan', 'Reference link'),
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isSvg
                        ? text(
                            'Salin kod SVG untuk disimpan atau dicetak melalui aplikasi pilihan anda.',
                            'Copy the SVG code to save or print it in an app of your choice.',
                          )
                        : text(
                            'Salin pautan ini untuk dibuka dalam pelayar anda.',
                            'Copy this link to open it in your browser.',
                          ),
                  ),
                  const SizedBox(height: 12),
                  if (isSvg)
                    ExpansionTile(
                      title: Text(text('Lihat kod SVG', 'View SVG code')),
                      children: [SelectableText(content)],
                    )
                  else
                    SelectableText(content),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: Text(text('Tutup', 'Close')),
              ),
              TextButton(
                onPressed: () async {
                  try {
                    await Clipboard.setData(ClipboardData(text: content));
                    if (dialogContext.mounted) Navigator.pop(dialogContext);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(text('Disalin', 'Copied'))),
                      );
                    }
                  } catch (_) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            text(
                              'Belum disalin. Pilih teks untuk mencuba semula.',
                              'Not copied. Select the text to retry.',
                            ),
                          ),
                        ),
                      );
                    }
                  }
                },
                child: Text(text('Salin', 'Copy')),
              ),
            ],
          );
        },
      );
    } finally {
      _nativeSheetOpen = false;
      _nativeDialogContext = null;
    }
  }

  @override
  void didUpdateWidget(covariant LearningModulePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mode != widget.mode) {
      unawaited(_controller!.launchMode(widget.mode));
    }
  }

  void _reopen() {
    final previous = _controller;
    final seed =
        previous?.isCurrent == true && previous?.recoveryRequired == false
        ? previous?.snapshot
        : null;
    _controller?.dispose();
    setState(() => _controller = _createController(recoverySeed: seed));
  }

  Future<BackDecision> _guardLeave() async {
    final result = await _controller!.captureCheckpoint();
    if (result.isSuccess || !mounted) return BackDecision.allow;
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(text('Draf belum disimpan', 'Draft not saved')),
        content: Text(
          text(
            'Kekal untuk mencuba simpan semula, atau keluar tanpa checkpoint terkini.',
            'Stay to retry saving, or leave without the latest checkpoint.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(text('Kekal', 'Stay')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(text('Keluar', 'Leave')),
          ),
        ],
      ),
    );
    return discard == true ? BackDecision.allow : BackDecision.stay;
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller!;
    final app = AppScope.of(context);
    return AnimatedBuilder(
      animation: Listenable.merge([c, _reflections]),
      builder: (context, _) => GeoMathScaffold(
        title: AppStrings.of(context).text(
          c.currentSection == widget.section
              ? widget.titleKey
              : 'learning.${c.currentSection}Title',
        ),
        showBackButton: true,
        onBack: app.router.back,
        scrollable: false,
        padding: EdgeInsets.zero,
        maxWidth: 1300,
        actions: [
          IconButton(
            tooltip: text('Rekod latihan', 'Study records'),
            onPressed: () => app.router.open('learning-records'),
            icon: const Icon(Icons.history_rounded),
          ),
          IconButton(
            tooltip: text('Tetapan', 'Settings'),
            onPressed: () => app.router.open('preferences'),
            icon: const Icon(Icons.tune_rounded),
          ),
        ],
        body: LayoutBuilder(
          builder: (context, constraints) {
            final controls = Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (widget.header != null) widget.header!,
                  if ([
                    'explore',
                    'views',
                    'notes',
                    'calculator',
                    'calculation',
                  ].contains(widget.section))
                    _navigationControls(c),
                  if (widget.section == 'net')
                    ActionButton(
                      label: text(
                        'Pratonton / salin SVG',
                        'Preview / copy SVG',
                      ),
                      icon: Icons.file_copy_outlined,
                      onPressed: c.isReady
                          ? () => unawaited(c.action({'action': 'export-net'}))
                          : null,
                    ),
                  if ([
                    'explore',
                    'views',
                    'notes',
                    'calculator',
                  ].contains(widget.section))
                    _shapeSelector(c),
                  if (['explore', 'views'].contains(widget.section)) ...[
                    const SizedBox(height: 8),
                    _modelToolbar(c),
                    if (widget.section == 'views') _viewControls(c),
                    if (['sphere', 'hemisphere'].contains(c.shape))
                      Text(
                        text(
                          'Bentuk ini tiada bentangan rata tepat dalam modul.',
                          'This model has no exact flat net in the module.',
                        ),
                      ),
                    if (c.shape == 'cube' || c.shape == 'cuboid')
                      ExpansionTile(
                        title: Text(
                          text('Muka dan warna', 'Faces and colours'),
                        ),
                        children: [
                          FaceLegend(
                            entries: [
                              for (var id = 0; id < 6; id++)
                                FaceLegendEntry(
                                  id: '$id',
                                  label: AppStrings.of(
                                    context,
                                  ).text('face.${FacePalette.semanticIds[id]}'),
                                  color: FacePalette.forFace(c.shape, id)!,
                                ),
                            ],
                          ),
                        ],
                      ),
                  ],
                  if (_reflections.saveFailure != null)
                    StatusNotice(
                      tone: StatusTone.error,
                      liveRegion: true,
                      message: text(
                        'Belum disimpan. Draf anda masih tersedia.',
                        'Not saved. Your draft is still available.',
                      ),
                      action: ActionButton(
                        label: text('Cuba simpan semula', 'Retry save'),
                        onPressed: _reflections.saving
                            ? null
                            : () => _reflections.retryFailed(),
                      ),
                    ),
                  if (_reflections.lastReceipt != null &&
                      _reflections.saveFailure == null &&
                      !_reflections.saving)
                    Text(
                      text(
                        'Refleksi terdahulu disimpan pada peranti',
                        'A reflection has been saved on this device',
                      ),
                      key: const ValueKey('learning-durable-receipt'),
                    ),
                  if (c.recoveryRequired)
                    StatusNotice(
                      tone: StatusTone.warning,
                      message: text(
                        'Draf lama belum dapat dipulihkan. Ia belum ditindih.',
                        'The previous draft could not be restored. It has not been overwritten.',
                      ),
                      action: Wrap(
                        spacing: 8,
                        children: [
                          ActionButton(
                            label: text('Cuba pulihkan', 'Retry recovery'),
                            expanded: false,
                            onPressed: () => c.recoverCheckpoint(),
                          ),
                          ActionButton(
                            label: text(
                              'Mulakan draf baharu',
                              'Start new draft',
                            ),
                            expanded: false,
                            onPressed: () =>
                                c.recoverCheckpoint(startNew: true),
                          ),
                        ],
                      ),
                    ),
                  if (c.checkpointFailure != null && !c.recoveryRequired)
                    StatusNotice(
                      tone: StatusTone.warning,
                      message: text(
                        'Checkpoint belum disimpan. Kekalkan halaman ini dan cuba semula.',
                        'Checkpoint not saved. Keep this page open and try again.',
                      ),
                      action: ActionButton(
                        label: text('Cuba semula', 'Retry'),
                        onPressed: () => c.captureCheckpoint(),
                      ),
                    ),
                  if (c.failure != null)
                    StatusNotice(
                      tone: StatusTone.error,
                      message: text(
                        'Tindakan belum selesai. Cuba semula atau buka semula modul.',
                        'Action not completed. Retry or reopen the module.',
                      ),
                      action: ActionButton(
                        label: text('Buka semula', 'Reopen'),
                        onPressed: _reopen,
                      ),
                    ),
                ],
              ),
            );
            final module = _module(c);
            if (constraints.maxWidth >= 768) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: 290,
                    child: SingleChildScrollView(child: controls),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(child: module),
                ],
              );
            }
            return Column(
              children: [
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: constraints.maxHeight * .38,
                  ),
                  child: SingleChildScrollView(child: controls),
                ),
                const Divider(height: 1),
                Expanded(child: module),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _shapeSelector(LearningModuleController c) {
    const ids = [
      'cube',
      'cuboid',
      'pyramid',
      'cylinder',
      'cone',
      'triangular-prism',
      'tetrahedron',
      'pentagonal-prism',
      'hexagonal-prism',
      'sphere',
      'hemisphere',
    ];
    return DropdownButtonFormField<String>(
      key: ValueKey('learning-shape-${c.shape}'),
      initialValue: c.shape,
      isExpanded: true,
      decoration: InputDecoration(labelText: text('Bongkah', 'Solid')),
      items: [
        for (final id in ids)
          DropdownMenuItem(
            value: id,
            child: Text(
              AppStrings.of(context)
                  .text('learning.shape.${id.replaceAll('-', '_')}'),
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
      onChanged: c.isReady
          ? (shape) {
              if (shape != null) {
                unawaited(
                  c.action({
                    'action': 'launch',
                    'section': widget.section,
                    'shape': shape,
                    if (widget.mode != null) 'mode': widget.mode,
                  }),
                );
              }
            }
          : null,
    );
  }

  Widget _modelToolbar(LearningModuleController c) => ModelToolbar(
    actions: [
      for (final item in [
        (
          'left',
          text('Putar kiri', 'Rotate left'),
          Icons.rotate_left_rounded,
          {'action': 'rotate', 'yaw': -.25, 'pitch': 0},
        ),
        (
          'right',
          text('Putar kanan', 'Rotate right'),
          Icons.rotate_right_rounded,
          {'action': 'rotate', 'yaw': .25, 'pitch': 0},
        ),
        (
          'zoom',
          text('Zum', 'Zoom in'),
          Icons.zoom_in_rounded,
          {'action': 'zoom', 'delta': .15},
        ),
        (
          'reset',
          text('Kamera asal', 'Reset camera'),
          Icons.center_focus_strong_rounded,
          {'action': 'reset'},
        ),
        (
          'fold',
          text('Buka', 'Unfold'),
          Icons.open_in_full_rounded,
          {'action': 'fold', 'value': 1},
        ),
        (
          'join',
          text('Cantum', 'Join'),
          Icons.close_fullscreen_rounded,
          {'action': 'fold', 'value': 0},
        ),
        (
          'pause',
          text('Jeda', 'Pause'),
          Icons.pause_rounded,
          {'action': 'pause'},
        ),
        (
          'resume',
          text('Sambung', 'Resume'),
          Icons.play_arrow_rounded,
          {'action': 'resume'},
        ),
      ])
        ModelToolbarAction(
          id: item.$1,
          label: item.$2,
          icon: item.$3,
          onPressed:
              c.isReady &&
                  !(['sphere', 'hemisphere'].contains(c.shape) &&
                      ['fold', 'join'].contains(item.$1)) &&
                  !(widget.section == 'views' &&
                      ['fold', 'join'].contains(item.$1))
              ? () => unawaited(c.action(item.$4))
              : null,
        ),
    ],
  );

  Widget _viewControls(LearningModuleController c) => ChoiceChips<String>(
    options: [
      for (final view in ['front', 'back', 'left', 'right', 'top', 'bottom'])
        ChoiceChipOption(
          value: view,
          label: AppStrings.of(context).text('face.$view'),
        ),
    ],
    selected:
        (c.snapshot?['explore'] as Map?)?['view'] as String? ?? _selectedView,
    onSelected: c.isReady
        ? (view) async {
            final result = await c.action({'action': 'view', 'view': view});
            if (mounted && result.isSuccess) {
              setState(() => _selectedView = view);
            }
          }
        : null,
  );

  Widget _navigationControls(LearningModuleController c) => ExpansionTile(
    title: Text(text('Alat pembelajaran', 'Learning tools')),
    children: [
      ModelToolbar(
        actions: [
          for (final item in [
            ('explore', 'learning.exploreTitle', Icons.view_in_ar_rounded),
            ('views', 'learning.viewsTitle', Icons.view_quilt_outlined),
            ('notes', 'learning.notesTitle', Icons.menu_book_outlined),
            (
              'calculator',
              'learning.calculatorTitle',
              Icons.calculate_outlined,
            ),
          ])
            ModelToolbarAction(
              id: 'go-${item.$1}',
              label: AppStrings.of(context).text(item.$2),
              icon: item.$3,
              selected: item.$1 == c.currentSection,
              onPressed: item.$1 == c.currentSection || !c.isReady
                  ? null
                  : () => unawaited(
                      c.action({
                        'action': 'launch',
                        'section': item.$1,
                        if (c.currentSection == 'calculation') 'shape': c.shape,
                      }),
                    ),
            ),
          if (['notes', 'calculator'].contains(c.currentSection))
            ModelToolbarAction(
              id: 'calculation-workflow',
              label: AppStrings.of(context).text('learning.calculationTitle'),
              icon: Icons.functions_rounded,
              onPressed: c.isReady
                  ? () => unawaited(
                      c.action({'action': 'workflow', 'target': 'calculation'}),
                    )
                  : null,
            ),
          if (['notes', 'calculator'].contains(c.currentSection))
            ModelToolbarAction(
              id: 'projection-workflow',
              label: AppStrings.of(context).text('learning.projectionTitle'),
              icon: Icons.architecture_rounded,
              onPressed: c.isReady
                  ? () => unawaited(
                      c.action({'action': 'workflow', 'target': 'projection'}),
                    )
                  : null,
            ),
        ],
      ),
    ],
  );

  Widget _module(LearningModuleController c) {
    if (c.host.phase == ModuleLoadPhase.failed ||
        c.host.phase == ModuleLoadPhase.closed) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 42),
              const SizedBox(height: 12),
              Text(
                text(
                  'Modul luar talian tidak tersedia. Buka semula untuk menyambung checkpoint yang sah.',
                  'Offline module unavailable. Reopen to restore a valid checkpoint.',
                ),
              ),
              const SizedBox(height: 16),
              ActionButton(
                label: text('Buka semula', 'Reopen'),
                onPressed: _reopen,
              ),
            ],
          ),
        ),
      );
    }
    final view = c.host.webViewController;
    if (view == null) return const Center(child: CircularProgressIndicator());
    return Stack(
      children: [
        WebViewWidget(
          key: const ValueKey('learning-webview'),
          controller: view,
          gestureRecognizers: {
            Factory<OneSequenceGestureRecognizer>(
              () => EagerGestureRecognizer(),
            ),
          },
        ),
        if (!c.isReady)
          const Align(
            alignment: Alignment.topCenter,
            child: LinearProgressIndicator(),
          ),
      ],
    );
  }

  @override
  void dispose() {
    unawaited(_actorSubscription?.cancel());
    if (_routeInstance case final instance?) _back?.unregister(instance);
    _controller?.dispose();
    super.dispose();
  }
}
