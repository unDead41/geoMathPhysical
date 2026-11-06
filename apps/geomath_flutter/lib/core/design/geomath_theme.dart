import 'package:flutter/material.dart';

import '../preferences/app_preferences.dart';
import 'design_tokens.g.dart';

/// Native dimensions are resolved from the same canonical rem tokens (16 dp).
abstract final class GeoMathSpacing {
  static double token(String name) {
    final value = DesignTokens.light[name]!;
    if (value == '0') return 0;
    return double.parse(value.replaceFirst('rem', '')) * 16;
  }

  static final xs = token('space-1');
  static final sm = token('space-2');
  static final md = token('space-3');
  static final lg = token('space-4');
  static final xl = token('space-6');
  static final xxl = token('space-8');
  static final cardRadius = token('radius');
  static final controlRadius = token('radius-control');
  // Native accessibility target supersedes the web's 44 dp control-size.
  static const touchTarget = 48.0;
  static final contentMaxWidth = token('content-max');
  static final formMaxWidth = token('form-max');
}

@immutable
final class GeoMathColors extends ThemeExtension<GeoMathColors> {
  const GeoMathColors({
    required this.primary,
    required this.ink,
    required this.muted,
    required this.border,
    required this.controlBorder,
    required this.field,
    required this.raised,
    required this.stage,
    required this.stageDot,
    required this.success,
    required this.successContainer,
    required this.warning,
    required this.warningContainer,
    required this.infoContainer,
    required this.dangerContainer,
    required this.dangerFill,
    required this.onDangerFill,
    required this.accent,
  });

  factory GeoMathColors.fromTokens(Map<String, String> tokens) => GeoMathColors(
    primary: _color(tokens, 'primary'),
    ink: _color(tokens, 'ink'),
    muted: _color(tokens, 'muted'),
    border: _color(tokens, 'border'),
    controlBorder: _color(tokens, 'border-control'),
    field: _color(tokens, 'surface-field'),
    raised: _color(tokens, 'surface-raised'),
    stage: _color(tokens, 'stage-bg'),
    stageDot: _color(tokens, 'stage-dot'),
    success: _color(tokens, 'success'),
    successContainer: _color(tokens, 'mint-soft'),
    warning: _color(tokens, 'warning-ink'),
    warningContainer: _color(tokens, 'warning-soft'),
    infoContainer: _color(tokens, 'blue-soft'),
    dangerContainer: _color(tokens, 'danger-soft'),
    dangerFill: _color(tokens, 'danger-fill'),
    onDangerFill: _color(tokens, 'on-danger-fill'),
    accent: _color(tokens, 'accent'),
  );

  static GeoMathColors of(BuildContext context) =>
      Theme.of(context).extension<GeoMathColors>() ??
      GeoMathColors.fromTokens(DesignTokens.light);

  final Color primary;
  final Color ink;
  final Color muted;
  final Color border;
  final Color controlBorder;
  final Color field;
  final Color raised;
  final Color stage;
  final Color stageDot;
  final Color success;
  final Color successContainer;
  final Color warning;
  final Color warningContainer;
  final Color infoContainer;
  final Color dangerContainer;
  final Color dangerFill;
  final Color onDangerFill;
  final Color accent;

  @override
  GeoMathColors copyWith({
    Color? primary,
    Color? ink,
    Color? muted,
    Color? border,
    Color? controlBorder,
    Color? field,
    Color? raised,
    Color? stage,
    Color? stageDot,
    Color? success,
    Color? successContainer,
    Color? warning,
    Color? warningContainer,
    Color? infoContainer,
    Color? dangerContainer,
    Color? dangerFill,
    Color? onDangerFill,
    Color? accent,
  }) => GeoMathColors(
    primary: primary ?? this.primary,
    ink: ink ?? this.ink,
    muted: muted ?? this.muted,
    border: border ?? this.border,
    controlBorder: controlBorder ?? this.controlBorder,
    field: field ?? this.field,
    raised: raised ?? this.raised,
    stage: stage ?? this.stage,
    stageDot: stageDot ?? this.stageDot,
    success: success ?? this.success,
    successContainer: successContainer ?? this.successContainer,
    warning: warning ?? this.warning,
    warningContainer: warningContainer ?? this.warningContainer,
    infoContainer: infoContainer ?? this.infoContainer,
    dangerContainer: dangerContainer ?? this.dangerContainer,
    dangerFill: dangerFill ?? this.dangerFill,
    onDangerFill: onDangerFill ?? this.onDangerFill,
    accent: accent ?? this.accent,
  );

  @override
  GeoMathColors lerp(covariant GeoMathColors? other, double t) {
    if (other == null) return this;
    return GeoMathColors(
      primary: Color.lerp(primary, other.primary, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      border: Color.lerp(border, other.border, t)!,
      controlBorder: Color.lerp(controlBorder, other.controlBorder, t)!,
      field: Color.lerp(field, other.field, t)!,
      raised: Color.lerp(raised, other.raised, t)!,
      stage: Color.lerp(stage, other.stage, t)!,
      stageDot: Color.lerp(stageDot, other.stageDot, t)!,
      success: Color.lerp(success, other.success, t)!,
      successContainer: Color.lerp(
        successContainer,
        other.successContainer,
        t,
      )!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningContainer: Color.lerp(
        warningContainer,
        other.warningContainer,
        t,
      )!,
      infoContainer: Color.lerp(infoContainer, other.infoContainer, t)!,
      dangerContainer: Color.lerp(dangerContainer, other.dangerContainer, t)!,
      dangerFill: Color.lerp(dangerFill, other.dangerFill, t)!,
      onDangerFill: Color.lerp(onDangerFill, other.onDangerFill, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
    );
  }
}

Color _color(Map<String, String> tokens, String name) =>
    Color(int.parse(tokens[name]!.substring(1), radix: 16) | 0xff000000);

abstract final class GeoMathTheme {
  static ThemeMode mode(AppTheme theme) => switch (theme) {
    AppTheme.light => ThemeMode.light,
    AppTheme.dark => ThemeMode.dark,
    AppTheme.system => ThemeMode.system,
  };

  static ThemeData light({bool strongContrast = false}) => _build(
    strongContrast ? DesignTokens.strong : DesignTokens.light,
    Brightness.light,
  );

  static ThemeData dark({bool strongContrast = false}) => _build(
    strongContrast ? DesignTokens.darkStrong : DesignTokens.dark,
    Brightness.dark,
  );

  static ThemeData _build(Map<String, String> tokens, Brightness brightness) {
    final colors = GeoMathColors.fromTokens(tokens);
    final surface = _color(tokens, 'surface');
    final primaryFill = _color(tokens, 'primary-fill');
    final scheme =
        ColorScheme.fromSeed(
          seedColor: colors.primary,
          brightness: brightness,
        ).copyWith(
          primary: primaryFill,
          onPrimary: _color(tokens, 'on-primary-fill'),
          primaryContainer: colors.infoContainer,
          onPrimaryContainer: colors.primary,
          secondary: colors.success,
          onSecondary: surface,
          secondaryContainer: colors.successContainer,
          onSecondaryContainer: colors.success,
          tertiary: colors.warning,
          tertiaryContainer: colors.warningContainer,
          onTertiaryContainer: colors.warning,
          surface: surface,
          onSurface: colors.ink,
          surfaceContainerLowest: surface,
          surfaceContainerLow: colors.field,
          surfaceContainer: colors.raised,
          surfaceContainerHigh: colors.stage,
          surfaceContainerHighest: colors.infoContainer,
          onSurfaceVariant: colors.muted,
          outline: colors.controlBorder,
          outlineVariant: colors.border,
          error: _color(tokens, 'danger'),
          onError: _color(tokens, 'on-danger-fill'),
          errorContainer: colors.dangerContainer,
          onErrorContainer: _color(tokens, 'danger'),
        );
    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: _color(tokens, 'bg'),
      visualDensity: VisualDensity.standard,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      extensions: [colors],
    );
    final text = base.textTheme
        .apply(bodyColor: colors.ink, displayColor: colors.ink)
        .copyWith(
          displaySmall: TextStyle(
            fontSize: 40,
            height: 1.25,
            fontWeight: FontWeight.w700,
            letterSpacing: -1,
            color: colors.ink,
          ),
          headlineLarge: TextStyle(
            fontSize: 32,
            height: 1.25,
            fontWeight: FontWeight.w700,
            letterSpacing: -.8,
            color: colors.ink,
          ),
          headlineMedium: TextStyle(
            fontSize: 24,
            height: 1.25,
            fontWeight: FontWeight.w700,
            letterSpacing: -.6,
            color: colors.ink,
          ),
          titleLarge: TextStyle(
            fontSize: 20,
            height: 1.3,
            fontWeight: FontWeight.w700,
            letterSpacing: -.3,
            color: colors.ink,
          ),
          titleMedium: TextStyle(
            fontSize: 18,
            height: 1.4,
            fontWeight: FontWeight.w700,
            color: colors.ink,
          ),
          bodyLarge: TextStyle(fontSize: 16, height: 1.65, color: colors.ink),
          bodyMedium: TextStyle(fontSize: 14, height: 1.65, color: colors.ink),
          bodySmall: TextStyle(fontSize: 12, height: 1.5, color: colors.muted),
          labelLarge: TextStyle(
            fontSize: 14,
            height: 1.4,
            fontWeight: FontWeight.w600,
            color: colors.ink,
          ),
        );
    final controlShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(GeoMathSpacing.controlRadius),
    );
    const controlPadding = EdgeInsets.symmetric(horizontal: 20, vertical: 14);
    final minimumSize = WidgetStatePropertyAll(
      Size(GeoMathSpacing.touchTarget, GeoMathSpacing.touchTarget),
    );
    return base.copyWith(
      textTheme: text,
      appBarTheme: AppBarTheme(
        backgroundColor: base.scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        elevation: 0,
        centerTitle: false,
        foregroundColor: colors.ink,
        titleTextStyle: text.titleLarge,
        toolbarHeight: 72,
      ),
      cardTheme: CardThemeData(
        color: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GeoMathSpacing.cardRadius),
          side: BorderSide(color: colors.border),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: ButtonStyle(
          minimumSize: minimumSize,
          padding: const WidgetStatePropertyAll(controlPadding),
          shape: WidgetStatePropertyAll(controlShape),
          textStyle: WidgetStatePropertyAll(text.labelLarge),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return _color(tokens, 'disabled-bg');
            }
            if (states.contains(WidgetState.pressed)) {
              return _color(tokens, 'primary-fill-pressed');
            }
            return primaryFill;
          }),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) {
              return _color(tokens, 'disabled-ink');
            }
            return scheme.onPrimary;
          }),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: ButtonStyle(
          minimumSize: minimumSize,
          padding: const WidgetStatePropertyAll(controlPadding),
          shape: WidgetStatePropertyAll(controlShape),
          side: WidgetStatePropertyAll(BorderSide(color: colors.controlBorder)),
          foregroundColor: WidgetStatePropertyAll(colors.primary),
          textStyle: WidgetStatePropertyAll(text.labelLarge),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: ButtonStyle(
          minimumSize: minimumSize,
          foregroundColor: WidgetStatePropertyAll(colors.primary),
          shape: WidgetStatePropertyAll(controlShape),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.field,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        labelStyle: text.bodyMedium?.copyWith(color: colors.muted),
        hintStyle: text.bodyMedium?.copyWith(color: colors.muted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(GeoMathSpacing.controlRadius),
          borderSide: BorderSide(color: colors.controlBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(GeoMathSpacing.controlRadius),
          borderSide: BorderSide(color: colors.controlBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(GeoMathSpacing.controlRadius),
          borderSide: BorderSide(color: colors.primary, width: 3),
        ),
        errorMaxLines: 4,
        helperMaxLines: 4,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surface,
        selectedColor: colors.infoContainer,
        secondarySelectedColor: colors.infoContainer,
        labelStyle: text.labelLarge,
        side: BorderSide(color: colors.controlBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GeoMathSpacing.controlRadius),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        showCheckmark: true,
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 80,
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: colors.infoContainer,
        labelTextStyle: WidgetStatePropertyAll(text.labelMedium),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? colors.primary
                : colors.muted,
          ),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: surface,
        indicatorColor: colors.infoContainer,
        selectedIconTheme: IconThemeData(color: colors.primary),
        unselectedIconTheme: IconThemeData(color: colors.muted),
        selectedLabelTextStyle: text.labelMedium?.copyWith(
          color: colors.primary,
        ),
        unselectedLabelTextStyle: text.labelMedium?.copyWith(
          color: colors.muted,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: ButtonStyle(
          minimumSize: minimumSize,
          tapTargetSize: MaterialTapTargetSize.padded,
        ),
      ),
      dividerTheme: DividerThemeData(color: colors.border, thickness: 1),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: surface,
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(GeoMathSpacing.xl),
          ),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GeoMathSpacing.cardRadius),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: colors.ink,
        contentTextStyle: text.bodyMedium?.copyWith(color: surface),
        shape: controlShape,
      ),
    );
  }
}

abstract final class GeoMathMotion {
  static Duration duration(BuildContext context, {String token = 'feedback'}) {
    if (MediaQuery.disableAnimationsOf(context)) return Duration.zero;
    final milliseconds = DesignTokens.light['motion-$token']!;
    return Duration(
      milliseconds: int.parse(milliseconds.replaceFirst('ms', '')),
    );
  }
}
