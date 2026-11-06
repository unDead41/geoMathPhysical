import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/widgets/widgets.dart';

typedef LearningActionCallback = Future<bool> Function(
  Map<String, Object?> action,
);

/// Accessible alternatives to orbit/pinch plus additive canonical tool panels.
/// Camera state belongs to the module; these controls issue bounded actions.
final class LearningCameraControls extends StatelessWidget {
  const LearningCameraControls({
    this.onAction,
    this.yaw = .55,
    this.pitch = .35,
    this.showPresets = true,
    super.key,
  });

  final LearningActionCallback? onAction;
  final double yaw;
  final double pitch;
  final bool showPresets;

  static const _presets = {
    'front': (0.0, 0.0),
    'back': (math.pi, 0.0),
    'left': (-math.pi / 2, 0.0),
    'right': (math.pi / 2, 0.0),
    'top': (0.0, math.pi / 2),
    'bottom': (0.0, -math.pi / 2),
    'isometric': (.55, .35),
  };

  bool _selected((double, double) angle) =>
      math.sin((yaw - angle.$1) / 2).abs() < .001 &&
      (pitch - angle.$2).abs() < .001;

  Future<void> _act(BuildContext context, Map<String, Object?> payload) async {
    final accepted = await onAction?.call(payload) ?? false;
    if (accepted && context.mounted) unawaited(GeoFeedback.selection(context));
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        ModelToolbar(
          actions: [
            for (final (id, label, icon, payload) in [
              (
                'left',
                'rotateLeft',
                Icons.rotate_left_rounded,
                <String, Object?>{'action': 'rotate', 'yaw': -.25, 'pitch': 0},
              ),
              (
                'right',
                'rotateRight',
                Icons.rotate_right_rounded,
                <String, Object?>{'action': 'rotate', 'yaw': .25, 'pitch': 0},
              ),
              (
                'zoom-in',
                'zoomIn',
                Icons.zoom_in_rounded,
                <String, Object?>{'action': 'zoom', 'delta': .15},
              ),
              (
                'zoom-out',
                'zoomOut',
                Icons.zoom_out_rounded,
                <String, Object?>{'action': 'zoom', 'delta': -.15},
              ),
              (
                'reset',
                'resetCamera',
                Icons.center_focus_strong_rounded,
                <String, Object?>{'action': 'reset'},
              ),
              (
                'pause',
                'pause',
                Icons.pause_rounded,
                <String, Object?>{'action': 'pause'},
              ),
              (
                'resume',
                'resume',
                Icons.play_arrow_rounded,
                <String, Object?>{'action': 'resume'},
              ),
            ])
              ModelToolbarAction(
                id: id,
                label: strings.text('learning.$label'),
                icon: icon,
                onPressed: onAction == null
                    ? null
                    : () => unawaited(_act(context, payload)),
              ),
          ],
        ),
        if (showPresets) ...[
          const SizedBox(height: 12),
          Text(
            strings.text('learning.cameraPresets'),
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final entry in _presets.entries)
                ConstrainedBox(
                  constraints: const BoxConstraints(
                    minWidth: 48,
                    minHeight: 48,
                  ),
                  child: ChoiceChip(
                    key: ValueKey('learning-preset-${entry.key}'),
                    label: Text(
                      strings.text(
                        entry.key == 'isometric'
                            ? 'learning.isometric'
                            : 'face.${entry.key}',
                      ),
                    ),
                    selected: _selected(entry.value),
                    onSelected: onAction == null
                        ? null
                        : (_) => unawaited(
                            _act(context, {
                              'action': 'preset',
                              'view': entry.key,
                            }),
                          ),
                  ),
                ),
            ],
          ),
        ],
        const SizedBox(height: 12),
        Text(
          strings.text('learning.toolPanels'),
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        ModelToolbar(
          actions: [
            for (final (id, label, icon, panel) in [
              ('panel-notes', 'notesTitle', Icons.menu_book_outlined, 'notes'),
              (
                'panel-calculator',
                'calculatorTitle',
                Icons.calculate_outlined,
                'calculator',
              ),
              ('panel-close', 'closePanel', Icons.close_rounded, 'none'),
            ])
              ModelToolbarAction(
                id: id,
                label: strings.text('learning.$label'),
                icon: icon,
                onPressed: onAction == null
                    ? null
                    : () => unawaited(
                        _act(context, {'action': 'panel', 'panel': panel}),
                      ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          strings.text('learning.panelHint'),
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

/// Coalesce a drag to at most one in-flight module action and the newest
/// pending position. Snapshot updates remain authoritative once dragging ends.
final class LearningUnfoldControl extends StatefulWidget {
  const LearningUnfoldControl({
    required this.shapeId,
    required this.progress,
    this.onChanged,
    super.key,
  });

  final String shapeId;
  final double progress;
  final Future<bool> Function(double progress)? onChanged;

  @override
  State<LearningUnfoldControl> createState() => _LearningUnfoldControlState();
}

final class _LearningUnfoldControlState extends State<LearningUnfoldControl> {
  double? _draft;
  double? _pending;
  bool _sending = false;
  bool _dragging = false;
  var _generation = 0;

  bool get _hasNet => !['sphere', 'hemisphere'].contains(widget.shapeId);

  @override
  void didUpdateWidget(covariant LearningUnfoldControl oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.shapeId != widget.shapeId || widget.onChanged == null) {
      _generation++;
      _pending = null;
      _draft = null;
      _dragging = false;
      _sending = false;
    }
  }

  void _change(double value) {
    if (!_hasNet || widget.onChanged == null) return;
    setState(() {
      _draft = value;
      _pending = value;
    });
    if (!_sending) unawaited(_flush());
  }

  Future<void> _flush() async {
    _sending = true;
    final generation = _generation;
    while (mounted && generation == _generation && _pending != null) {
      final value = _pending!;
      _pending = null;
      final accepted = await widget.onChanged!(value);
      if (!mounted || generation != _generation) return;
      if (!accepted) {
        _pending = null;
        _dragging = false;
        break;
      }
    }
    if (!mounted || generation != _generation) return;
    setState(() {
      _sending = false;
      if (!_dragging) _draft = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppStrings.of(context);
    if (!_hasNet) return Text(strings.text('learning.noExactNet'));
    final value = (_draft ?? widget.progress).clamp(0.0, 1.0);
    final percent = '${(value * 100).round()}%';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          strings.text(
            'learning.unfoldPosition',
            parameters: {'percent': percent},
          ),
          style: Theme.of(context).textTheme.labelLarge,
        ),
        Semantics(
          label: strings.text('learning.unfold'),
          child: Slider(
            key: const ValueKey('learning-unfold-slider'),
            value: value,
            label: percent,
            semanticFormatterCallback: (value) => '${(value * 100).round()}%',
            onChangeStart: widget.onChanged == null
                ? null
                : (_) => _dragging = true,
            onChanged: widget.onChanged == null ? null : _change,
            onChangeEnd: widget.onChanged == null
                ? null
                : (_) {
                    _dragging = false;
                    if (!_sending) setState(() => _draft = null);
                  },
          ),
        ),
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 8,
          runSpacing: 8,
          children: [
            ActionButton(
              key: const ValueKey('learning-fold-closed'),
              label: strings.text('learning.join'),
              icon: Icons.close_fullscreen_rounded,
              expanded: false,
              kind: ActionButtonKind.secondary,
              onPressed: widget.onChanged == null ? null : () => _change(0),
            ),
            ActionButton(
              key: const ValueKey('learning-fold-open'),
              label: strings.text('learning.unfold'),
              icon: Icons.open_in_full_rounded,
              expanded: false,
              kind: ActionButtonKind.secondary,
              onPressed: widget.onChanged == null ? null : () => _change(1),
            ),
          ],
        ),
      ],
    );
  }
}
