import 'package:flutter/material.dart';

import '../../core/design/design.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/preferences/preferences.dart';
import '../../core/widgets/widgets.dart';

/// Screen 37. Screen 38 is the same app with the persisted dark preference;
/// neither the screen nor this repository owns activity/camera state.
final class PreferencesScreen extends StatefulWidget {
  const PreferencesScreen({
    required this.repository,
    this.onBack,
    this.bottomNavigationBar,
    super.key,
  });

  final PreferencesRepository repository;
  final VoidCallback? onBack;
  final Widget? bottomNavigationBar;

  @override
  State<PreferencesScreen> createState() => _PreferencesScreenState();
}

final class _PreferencesScreenState extends State<PreferencesScreen> {
  bool _saving = false;
  bool _failed = false;
  bool _saved = false;
  AppPreferences? _attempt;

  Future<void> _save(AppPreferences preferences) async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _failed = false;
      _saved = false;
      _attempt = preferences;
    });
    final result = await widget.repository.save(preferences);
    if (!mounted) return;
    setState(() {
      _saving = false;
      _failed = !result.isSuccess;
      _saved = result.isSuccess;
      if (result.isSuccess) _attempt = null;
    });
  }

  Future<void> _pick<T>({
    required String title,
    required T selected,
    required List<ChoiceChipOption<T>> options,
    required AppPreferences Function(T) update,
  }) async {
    if (_saving) return;
    final choice = await showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            20,
            0,
            20,
            24 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              const SizedBox(height: 16),
              for (final option in options)
                Semantics(
                  selected: option.value == selected,
                  child: ListTile(
                    key: ValueKey('preference-option-${option.value}'),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    minTileHeight: GeoMathSpacing.touchTarget,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    title: Text(option.label),
                    leading: option.icon == null ? null : Icon(option.icon),
                    trailing: option.value == selected
                        ? Icon(
                            Icons.check_circle_rounded,
                            color: GeoMathColors.of(context).primary,
                          )
                        : const Icon(Icons.circle_outlined),
                    onTap: () => Navigator.of(context).pop(option.value),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    if (!mounted || choice == null || choice == selected) return;
    GeoFeedback.selection(context);
    await _save(update(choice));
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.repository,
    builder: (context, _) {
      final preferences = widget.repository.value;
      final strings = AppStrings(
        preferences.language,
        contributions: AppStrings.of(context).contributions,
      );
      String t(String key) => strings.text(key);
      String local(String key) => _labels[preferences.language]![key]!;
      final language = preferences.language == AppLanguage.ms
          ? t('settings.malay')
          : t('settings.english');
      final theme = switch (preferences.theme) {
        AppTheme.light => t('settings.light'),
        AppTheme.dark => t('settings.dark'),
        AppTheme.system => t('settings.system'),
      };
      return GeoMathScaffold(
        title: t('settings.title'),
        showBackButton: true,
        onBack: widget.onBack,
        bottomNavigationBar: widget.bottomNavigationBar,
        maxWidth: 640,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_failed) ...[
              RetryPanel(
                key: const ValueKey('preferences-error'),
                title: t('common.notSaved'),
                message: t('settings.saveFailed'),
                retryLabel: t('common.retry'),
                onRetry: _attempt == null ? null : () => _save(_attempt!),
              ),
              const SizedBox(height: 16),
            ],
            _PreferenceGroup(
              title: local('appearance'),
              subtitle: local('textScaleNote'),
              children: [
                _ChoiceRow(
                  id: 'language',
                  label: t('settings.language'),
                  value: language,
                  hint: t('settings.languageHint'),
                  icon: Icons.language_rounded,
                  enabled: !_saving,
                  onPressed: () => _pick<AppLanguage>(
                    title: t('settings.language'),
                    selected: preferences.language,
                    options: [
                      ChoiceChipOption(
                        value: AppLanguage.ms,
                        label: t('settings.malay'),
                      ),
                      ChoiceChipOption(
                        value: AppLanguage.en,
                        label: t('settings.english'),
                      ),
                    ],
                    update: (value) =>
                        widget.repository.value.copyWith(language: value),
                  ),
                ),
                _ChoiceRow(
                  id: 'theme',
                  label: t('settings.theme'),
                  value: theme,
                  hint: t('settings.themeHint'),
                  icon: Icons.palette_outlined,
                  enabled: !_saving,
                  onPressed: () => _pick<AppTheme>(
                    title: t('settings.theme'),
                    selected: preferences.theme,
                    options: [
                      ChoiceChipOption(
                        value: AppTheme.light,
                        label: t('settings.light'),
                        icon: Icons.light_mode_outlined,
                      ),
                      ChoiceChipOption(
                        value: AppTheme.dark,
                        label: t('settings.dark'),
                        icon: Icons.dark_mode_outlined,
                      ),
                      ChoiceChipOption(
                        value: AppTheme.system,
                        label: t('settings.system'),
                        icon: Icons.phone_android_outlined,
                      ),
                    ],
                    update: (value) =>
                        widget.repository.value.copyWith(theme: value),
                  ),
                ),
                _ChoiceRow(
                  id: 'text-scale',
                  label: t('settings.textSize'),
                  value: '${(preferences.textScale * 100).round()}%',
                  hint: t('settings.textSizeHint'),
                  icon: Icons.text_increase_rounded,
                  enabled: !_saving,
                  onPressed: () => _pick<double>(
                    title: t('settings.textSize'),
                    selected: preferences.textScale,
                    options: [
                      for (final scale in AppPreferences.supportedTextScales)
                        ChoiceChipOption(
                          value: scale,
                          label: '${(scale * 100).round()}%',
                        ),
                    ],
                    update: (value) =>
                        widget.repository.value.copyWith(textScale: value),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _PreferenceGroup(
              title: local('feedback'),
              children: [
                _SwitchRow(
                  id: 'music',
                  label: t('settings.music'),
                  hint: t('settings.musicHint'),
                  icon: Icons.music_note_outlined,
                  value: preferences.musicEnabled,
                  onChanged: _saving
                      ? null
                      : (value) =>
                            _save(preferences.copyWith(musicEnabled: value)),
                ),
                _SwitchRow(
                  id: 'sound',
                  label: t('settings.sound'),
                  hint: t('settings.soundHint'),
                  icon: Icons.volume_up_outlined,
                  value: preferences.soundEnabled,
                  onChanged: _saving
                      ? null
                      : (value) =>
                            _save(preferences.copyWith(soundEnabled: value)),
                ),
                _SwitchRow(
                  id: 'haptics',
                  label: local('haptics'),
                  hint: local('hapticsHint'),
                  icon: Icons.vibration_rounded,
                  value: preferences.hapticsEnabled,
                  onChanged: _saving
                      ? null
                      : (value) =>
                            _save(preferences.copyWith(hapticsEnabled: value)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _PreferenceGroup(
              title: local('accessibility'),
              children: [
                _SwitchRow(
                  id: 'motion',
                  label: t('settings.reducedMotion'),
                  hint: t('settings.reducedMotionHint'),
                  icon: Icons.accessibility_new_rounded,
                  value: preferences.reducedMotion,
                  onChanged: _saving
                      ? null
                      : (value) =>
                            _save(preferences.copyWith(reducedMotion: value)),
                ),
                _SwitchRow(
                  id: 'contrast',
                  label: t('settings.strongContrast'),
                  hint: t('settings.strongContrastHint'),
                  icon: Icons.contrast_rounded,
                  value: preferences.strongContrast,
                  onChanged: _saving
                      ? null
                      : (value) =>
                            _save(preferences.copyWith(strongContrast: value)),
                ),
              ],
            ),
            const SizedBox(height: 20),
            StatusNotice(message: t('settings.localNote')),
            const SizedBox(height: 16),
            Semantics(
              liveRegion: true,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_saving)
                    SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        value: MediaQuery.disableAnimationsOf(context)
                            ? .5
                            : null,
                      ),
                    )
                  else
                    Icon(
                      _saved
                          ? Icons.check_circle_outline_rounded
                          : Icons.tune_rounded,
                      size: 18,
                      color: _saved
                          ? GeoMathColors.of(context).success
                          : GeoMathColors.of(context).muted,
                    ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _saving
                          ? t('common.saving')
                          : _saved
                          ? t('common.saved')
                          : t('settings.saveState'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    },
  );
}

final class _PreferenceGroup extends StatelessWidget {
  const _PreferenceGroup({
    required this.title,
    this.subtitle,
    required this.children,
  });

  final String title;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SectionHeader(title: title, subtitle: subtitle),
      const SizedBox(height: 12),
      GeoMathCard(
        padding: EdgeInsets.zero,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var index = 0; index < children.length; index++) ...[
              if (index > 0) const Divider(height: 1),
              children[index],
            ],
          ],
        ),
      ),
    ],
  );
}

const _labels = {
  AppLanguage.ms: {
    'appearance': 'Paparan',
    'textScaleNote': 'Saiz teks peranti turut digunakan bersama pilihan ini.',
    'feedback': 'Bunyi dan maklum balas',
    'accessibility': 'Kebolehcapaian',
    'haptics': 'Getaran sentuhan',
    'hapticsHint': 'Getaran ringkas apabila membuat pilihan. Dimatikan apabila gerakan dikurangkan.',
  },
  AppLanguage.en: {
    'appearance': 'Appearance',
    'textScaleNote':
        'Your device text size is also applied alongside this preference.',
    'feedback': 'Sound and feedback',
    'accessibility': 'Accessibility',
    'haptics': 'Touch feedback',
    'hapticsHint': 'A brief vibration when making a selection. Disabled with reduced motion.',
  },
};

final class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    required this.id,
    required this.label,
    required this.value,
    required this.hint,
    required this.icon,
    required this.enabled,
    required this.onPressed,
  });

  final String id;
  final String label;
  final String value;
  final String hint;
  final IconData icon;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Semantics(
    label: '$label, $value',
    hint: hint,
    button: true,
    enabled: enabled,
    onTap: enabled ? onPressed : null,
    excludeSemantics: true,
    child: InkWell(
      key: ValueKey('preference-$id'),
      onTap: enabled ? onPressed : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final narrow =
                constraints.maxWidth < 280 ||
                MediaQuery.textScalerOf(context).scale(16) > 20;
            final title = Text(
              label,
              style: Theme.of(context).textTheme.labelLarge,
            );
            final currentValue = Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: GeoMathColors.of(context).muted),
            );
            return Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(icon, size: 24),
                const SizedBox(width: 14),
                Expanded(
                  child: narrow
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            title,
                            const SizedBox(height: 4),
                            currentValue,
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(child: title),
                            const SizedBox(width: 12),
                            Flexible(child: currentValue),
                          ],
                        ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.expand_more_rounded),
              ],
            );
          },
        ),
      ),
    ),
  );
}

final class _SwitchRow extends StatelessWidget {
  const _SwitchRow({
    required this.id,
    required this.label,
    required this.hint,
    required this.icon,
    required this.value,
    required this.onChanged,
  });

  final String id;
  final String label;
  final String hint;
  final IconData icon;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => Semantics(
    hint: hint,
    child: SwitchListTile(
      key: ValueKey('preference-$id'),
      value: value,
      onChanged: onChanged,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      secondary: ExcludeSemantics(child: Icon(icon, size: 24)),
      title: Text(label, style: Theme.of(context).textTheme.labelLarge),
      isThreeLine: false,
    ),
  );
}
