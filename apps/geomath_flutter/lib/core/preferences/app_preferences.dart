import 'package:flutter/foundation.dart';

enum AppLanguage { ms, en }

enum AppTheme { light, dark, system }

/// The single native and module preference snapshot. It contains no activity
/// state, so changing it cannot replace a camera, draft or session identity.
@immutable
final class AppPreferences {
  const AppPreferences({
    this.language = AppLanguage.ms,
    this.theme = AppTheme.system,
    this.textScale = 1,
    this.strongContrast = false,
    this.reducedMotion = false,
    this.musicEnabled = true,
    this.soundEnabled = true,
    this.hapticsEnabled = true,
  }) : assert(textScale == 1 || textScale == 1.25 || textScale == 1.5);

  static const schemaVersion = 1;
  static const supportedTextScales = <double>[1, 1.25, 1.5];

  final AppLanguage language;
  final AppTheme theme;
  final double textScale;
  final bool strongContrast;
  final bool reducedMotion;
  final bool musicEnabled;
  final bool soundEnabled;
  final bool hapticsEnabled;

  bool get isValid => supportedTextScales.contains(textScale);

  AppPreferences copyWith({
    AppLanguage? language,
    AppTheme? theme,
    double? textScale,
    bool? strongContrast,
    bool? reducedMotion,
    bool? musicEnabled,
    bool? soundEnabled,
    bool? hapticsEnabled,
  }) => AppPreferences(
    language: language ?? this.language,
    theme: theme ?? this.theme,
    textScale: textScale ?? this.textScale,
    strongContrast: strongContrast ?? this.strongContrast,
    reducedMotion: reducedMotion ?? this.reducedMotion,
    musicEnabled: musicEnabled ?? this.musicEnabled,
    soundEnabled: soundEnabled ?? this.soundEnabled,
    hapticsEnabled: hapticsEnabled ?? this.hapticsEnabled,
  );

  Map<String, Object> toJson() => {
    'schemaVersion': schemaVersion,
    'language': language.name,
    'theme': theme.name,
    'textScale': textScale,
    'strongContrast': strongContrast,
    'reducedMotion': reducedMotion,
    'musicEnabled': musicEnabled,
    'soundEnabled': soundEnabled,
    'hapticsEnabled': hapticsEnabled,
  };

  /// Invalid or future data is rejected; the repository never overwrites it
  /// with defaults as a side effect of opening the app.
  static AppPreferences fromJson(Map<String, Object?> json) {
    if (json['schemaVersion'] != schemaVersion) {
      throw const FormatException('Unsupported preferences schema.');
    }
    final language = switch (json['language']) {
      'ms' => AppLanguage.ms,
      'en' => AppLanguage.en,
      _ => throw const FormatException('Unsupported preference language.'),
    };
    final theme = switch (json['theme']) {
      'light' => AppTheme.light,
      'dark' => AppTheme.dark,
      'system' => AppTheme.system,
      _ => throw const FormatException('Unsupported preference theme.'),
    };
    final scale = json['textScale'];
    if (scale is! num || !supportedTextScales.contains(scale.toDouble())) {
      throw const FormatException('Unsupported text scale.');
    }
    bool flag(String key) {
      final value = json[key];
      if (value is! bool) throw FormatException('Invalid preference $key.');
      return value;
    }

    return AppPreferences(
      language: language,
      theme: theme,
      textScale: scale.toDouble(),
      strongContrast: flag('strongContrast'),
      reducedMotion: flag('reducedMotion'),
      musicEnabled: flag('musicEnabled'),
      soundEnabled: flag('soundEnabled'),
      // This additive field keeps already-saved schema-v1 settings readable.
      // An explicitly malformed value still fails without replacing storage.
      hapticsEnabled: json.containsKey('hapticsEnabled')
          ? flag('hapticsEnabled')
          : true,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is AppPreferences &&
      language == other.language &&
      theme == other.theme &&
      textScale == other.textScale &&
      strongContrast == other.strongContrast &&
      reducedMotion == other.reducedMotion &&
      musicEnabled == other.musicEnabled &&
      soundEnabled == other.soundEnabled &&
      hapticsEnabled == other.hapticsEnabled;

  @override
  int get hashCode => Object.hash(
    language,
    theme,
    textScale,
    strongContrast,
    reducedMotion,
    musicEnabled,
    soundEnabled,
    hapticsEnabled,
  );
}
