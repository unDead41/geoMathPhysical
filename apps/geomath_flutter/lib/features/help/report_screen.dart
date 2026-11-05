import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/app_dependencies.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/result.dart';
import '../../core/widgets/widgets.dart';
import 'local_report.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({
    super.key,
    this.exporter = const AndroidReportExporter(),
  });
  final LocalReportExporter exporter;
  @override
  State<ReportScreen> createState() => ReportScreenState();
}

class ReportScreenState extends State<ReportScreen> {
  final form = GlobalKey<FormState>();
  final fields = {
    for (final key in ['description', 'steps', 'expected', 'actual'])
      key: TextEditingController(),
  };
  String category = 'general';
  bool exported = false;
  final saving = ValueNotifier<bool>(false);
  final feedback = ValueNotifier<(String, bool)?>(null);
  final feedbackKey = GlobalKey();
  bool get dirty =>
      !exported &&
      (category != 'general' || fields.values.any((f) => f.text.isNotEmpty));

  Future<bool> confirmLeave() async {
    if (!dirty) return true;
    FocusManager.instance.primaryFocus?.unfocus();
    final s = AppStrings.of(context);
    return showGeoMathConfirmation(
      context,
      title: s.text('foundation.discardTitle'),
      message: s.text('foundation.discardBody'),
      confirmLabel: s.text('foundation.discard'),
      cancelLabel: s.text('foundation.stay'),
      danger: true,
    );
  }

  String _content(AppStrings s) => redactReportText(
    [
      'GeoMath 0.1.0+1',
      s.text('foundation.localReportBody'),
      '',
      '${s.text('foundation.category')}: ${s.text('foundation.$category')}',
      for (final field in fields.entries) ...[
        '',
        s.text('foundation.${field.key}'),
        field.value.text.trim(),
      ],
    ].join('\n'),
  );

  void _notice(String message, {bool error = false}) {
    if (!mounted) return;
    feedback.value = (message, error);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = feedbackKey.currentContext;
      if (mounted && target != null) {
        Scrollable.ensureVisible(target, duration: Duration.zero, alignment: 1);
      }
    });
  }

  Future<void> _preview() async {
    if (!form.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    final s = AppStrings.of(context);
    final content = _content(s);
    feedback.value = null;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.88,
        minChildSize: 0.5,
        maxChildSize: 0.96,
        builder: (sheetContext, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [
            Text(
              s.text('foundation.preview'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            SelectableText(content, key: const ValueKey('report-preview-text')),
            const SizedBox(height: 20),
            ActionButton(
              key: const ValueKey('report-copy'),
              kind: ActionButtonKind.secondary,
              label: s.text('foundation.copy'),
              icon: Icons.copy_rounded,
              onPressed: () async {
                try {
                  await Clipboard.setData(ClipboardData(text: content));
                  _notice(s.text('foundation.copied'));
                } catch (_) {
                  _notice(s.text('foundation.copyFailed'), error: true);
                }
              },
            ),
            const SizedBox(height: 12),
            ValueListenableBuilder<bool>(
              valueListenable: saving,
              builder: (context, busy, _) => ActionButton(
                key: const ValueKey('report-export'),
                label: s.text('foundation.export'),
                icon: Icons.save_alt_rounded,
                busy: busy,
                onPressed: () async {
                  saving.value = true;
                  final result = await widget.exporter.saveText(content);
                  if (!mounted) return;
                  saving.value = false;
                  switch (result) {
                    case Success<bool>(:final value):
                      if (value) setState(() => exported = true);
                      _notice(
                        s.text(
                          value
                              ? 'foundation.exported'
                              : 'foundation.cancelled',
                        ),
                      );
                    case Failed<bool>():
                      _notice(s.text('foundation.exportFailed'), error: true);
                  }
                },
              ),
            ),
            ValueListenableBuilder<(String, bool)?>(
              valueListenable: feedback,
              builder: (context, value, _) => value == null
                  ? const SizedBox.shrink()
                  : Padding(
                      key: feedbackKey,
                      padding: const EdgeInsets.only(top: 16),
                      child: StatusNotice(
                        message: value.$1,
                        liveRegion: true,
                        tone: value.$2 ? StatusTone.error : StatusTone.success,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings.of(context);
    return GeoMathScaffold(
      title: s.text('foundation.report'),
      onBack: AppScope.of(context).router.back,
      body: Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            StatusNotice(
              title: s.text('foundation.localReport'),
              message: s.text('foundation.localReportBody'),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              key: const ValueKey('report-category'),
              initialValue: category,
              isExpanded: true,
              decoration: InputDecoration(
                labelText: s.text('foundation.category'),
              ),
              items: [
                for (final value in [
                  'general',
                  'module',
                  'game',
                  'account',
                  'classes',
                ])
                  DropdownMenuItem(
                    value: value,
                    child: Text(s.text('foundation.$value')),
                  ),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    category = value;
                    exported = false;
                  });
                }
              },
            ),
            const SizedBox(height: 20),
            for (final field in fields.entries) ...[
              LabeledField(
                key: ValueKey('report-${field.key}'),
                label: s.text('foundation.${field.key}'),
                controller: field.value,
                minLines: 2,
                maxLines: 5,
                maxLength: field.key == 'steps' ? 600 : 400,
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.newline,
                onChanged: (_) => exported = false,
                validator: (value) =>
                    value == null || value.trim().runes.length < 3
                    ? s.text('foundation.required')
                    : null,
              ),
              const SizedBox(height: 16),
            ],
            Text(
              s.text('foundation.privacy'),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            ActionButton(
              key: const ValueKey('report-preview'),
              label: s.text('foundation.preview'),
              icon: Icons.description_outlined,
              onPressed: _preview,
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    saving.dispose();
    feedback.dispose();
    for (final c in fields.values) {
      c.dispose();
    }
    super.dispose();
  }
}
