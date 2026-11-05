import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../preferences/app_preferences.dart';

/// One string owner; feature maps are supplied by the composition registry.
/// Contribution keys use `namespace.key`, and language keys are `ms` / `en`.
@immutable
final class AppStrings {
  const AppStrings(this.language, {this.contributions = const {}});

  final AppLanguage language;
  final Map<String, Map<String, String>> contributions;

  static const supportedLocales = [Locale('ms'), Locale('en')];
  static const reservedNamespaces = {
    'app',
    'nav',
    'common',
    'settings',
    'home',
    'help',
    'shape',
    'face',
    'model',
  };
  static const LocalizationsDelegate<AppStrings> delegate =
      _AppStringsDelegate();

  Locale get locale => Locale(language.name);

  static AppStrings of(BuildContext context) {
    final scoped = context
        .dependOnInheritedWidgetOfExactType<AppStringsScope>();
    if (scoped != null) return scoped.strings;
    return Localizations.of<AppStrings>(context, AppStrings) ??
        AppStrings(
          Localizations.maybeLocaleOf(context)?.languageCode == 'en'
              ? AppLanguage.en
              : AppLanguage.ms,
        );
  }

  String text(
    String key, {
    String? fallback,
    Map<String, Object> parameters = const {},
  }) {
    String? lookup(String locale) =>
        contributions[locale]?[key] ?? _translations[locale]?[key];
    var value =
        lookup(language.name) ??
        lookup('en') ??
        lookup('ms') ??
        fallback ??
        key;
    for (final entry in parameters.entries) {
      value = value.replaceAll('{${entry.key}}', entry.value.toString());
    }
    return value;
  }

  static const _translations = <String, Map<String, String>>{
    'ms': {
      'app.name': 'GeoMath',
      'app.tagline': 'Geometri lebih mudah difahami',
      'nav.home': 'Utama',
      'nav.learn': 'Belajar',
      'nav.play': 'Main',
      'nav.classes': 'Kelas',
      'nav.profile': 'Profil',
      'common.back': 'Kembali',
      'common.cancel': 'Batal',
      'common.close': 'Tutup',
      'common.save': 'Simpan',
      'common.saving': 'Sedang menyimpan…',
      'common.saved': 'Disimpan pada peranti ini',
      'common.retry': 'Cuba semula',
      'common.continue': 'Teruskan',
      'common.learnMore': 'Ketahui lanjut',
      'common.offline': 'Tersedia di luar talian',
      'common.notAvailable': 'Belum tersedia',
      'common.notFinished': 'Pembangunan belum lengkap',
      'common.selected': 'Dipilih',
      'common.notSaved': 'Belum disimpan',
      'common.loading': 'Sedang memuat…',
      'common.discard': 'Buang perubahan',
      'common.stay': 'Terus menyunting',
      'settings.title': 'Tetapan',
      'settings.subtitle': 'Jadikan GeoMath selesa untuk anda.',
      'settings.localNote': 'Tetapan disimpan pada peranti ini dan digunakan dalam semua aktiviti.',
      'settings.language': 'Bahasa',
      'settings.languageHint': 'Pilih bahasa untuk arahan dan paparan.',
      'settings.malay': 'Bahasa Melayu',
      'settings.english': 'English',
      'settings.appearance': 'Paparan',
      'settings.theme': 'Tema',
      'settings.themeHint': 'Pilih rupa paparan atau ikut tetapan peranti.',
      'settings.light': 'Cerah',
      'settings.dark': 'Gelap',
      'settings.system': 'Sistem',
      'settings.textSize': 'Saiz teks',
      'settings.textSizeHint':
          'Arahan dan butang kekal boleh dicapai pada setiap saiz.',
      'settings.textPreview': 'Bentuk, ruang dan idea baharu.',
      'settings.accessibility': 'Kebolehcapaian',
      'settings.strongContrast': 'Kontras tinggi',
      'settings.strongContrastHint': 'Jadikan teks dan sempadan lebih jelas.',
      'settings.reducedMotion': 'Kurangkan gerakan',
      'settings.reducedMotionHint': 'Hadkan animasi dan gerakan automatik.',
      'settings.audio': 'Audio',
      'settings.music': 'Muzik latar',
      'settings.musicHint': 'Benarkan muzik apabila aktiviti menyediakannya.',
      'settings.sound': 'Kesan bunyi',
      'settings.soundHint': 'Benarkan bunyi tindakan dan maklum balas.',
      'settings.audioNote':
          'Audio hanya dimainkan oleh aktiviti yang menyediakannya.',
      'settings.saveFailed': 'Tetapan belum disimpan. Cuba semula; tetapan sebelum ini masih digunakan.',
      'settings.previewOnly': 'Pratonton tetapan',
      'settings.saveState': 'Perubahan disimpan secara automatik',
      'home.greeting': 'Mari teroka geometri',
      'home.title': 'Lihat bentuk. Fahami ruang.',
      'home.subtitle':
          'Putar, buka bentangan dan belajar langkah demi langkah.',
      'home.startLearning': 'Mula belajar',
      'home.play': 'Main GeoMath',
      'home.guide': 'Cara bermain',
      'home.help': 'Bantuan',
      'help.title': 'Pusat bantuan',
      'help.subtitle': 'Panduan ringkas untuk meneruskan pembelajaran.',
      'help.howToPlay': 'Cara bermain',
      'help.report': 'Lapor masalah',
      'help.localReport': 'Laporan setempat',
      'shape.cube': 'Kubus',
      'shape.cuboid': 'Kuboid',
      'shape.pyramid': 'Piramid',
      'shape.cylinder': 'Silinder',
      'shape.cone': 'Kon',
      'face.front': 'Depan',
      'face.right': 'Kanan',
      'face.back': 'Belakang',
      'face.left': 'Kiri',
      'face.top': 'Atas',
      'face.bottom': 'Bawah',
      'model.rotate': 'Putar',
      'model.reset': 'Set semula',
      'model.unfold': 'Buka bentangan',
      'model.fold': 'Cantum semula',
      'model.fullscreen': 'Skrin penuh',
      'model.legend': 'Warna muka',
    },
    'en': {
      'app.name': 'GeoMath',
      'app.tagline': 'Make sense of geometry',
      'nav.home': 'Home',
      'nav.learn': 'Learn',
      'nav.play': 'Play',
      'nav.classes': 'Classes',
      'nav.profile': 'Profile',
      'common.back': 'Back',
      'common.cancel': 'Cancel',
      'common.close': 'Close',
      'common.save': 'Save',
      'common.saving': 'Saving…',
      'common.saved': 'Saved on this device',
      'common.retry': 'Try again',
      'common.continue': 'Continue',
      'common.learnMore': 'Learn more',
      'common.offline': 'Available offline',
      'common.notAvailable': 'Not available yet',
      'common.notFinished': 'Development is incomplete',
      'common.selected': 'Selected',
      'common.notSaved': 'Not saved',
      'common.loading': 'Loading…',
      'common.discard': 'Discard changes',
      'common.stay': 'Keep editing',
      'settings.title': 'Settings',
      'settings.subtitle': 'Make GeoMath comfortable for you.',
      'settings.localNote':
          'Settings are saved on this device and used across activities.',
      'settings.language': 'Language',
      'settings.languageHint':
          'Choose the language for instructions and screens.',
      'settings.malay': 'Bahasa Melayu',
      'settings.english': 'English',
      'settings.appearance': 'Appearance',
      'settings.theme': 'Theme',
      'settings.themeHint': 'Choose a theme or follow your device settings.',
      'settings.light': 'Light',
      'settings.dark': 'Dark',
      'settings.system': 'System',
      'settings.textSize': 'Text size',
      'settings.textSizeHint':
          'Instructions and actions remain accessible at every size.',
      'settings.textPreview': 'Shapes, space and new ideas.',
      'settings.accessibility': 'Accessibility',
      'settings.strongContrast': 'High contrast',
      'settings.strongContrastHint': 'Make text and outlines clearer.',
      'settings.reducedMotion': 'Reduce motion',
      'settings.reducedMotionHint': 'Limit animations and automatic movement.',
      'settings.audio': 'Audio',
      'settings.music': 'Background music',
      'settings.musicHint': 'Allow music when an activity provides it.',
      'settings.sound': 'Sound effects',
      'settings.soundHint': 'Allow action and feedback sounds.',
      'settings.audioNote':
          'Audio is played only by activities that provide it.',
      'settings.saveFailed': 'Settings have not been saved. Try again; your previous settings still apply.',
      'settings.previewOnly': 'Settings preview',
      'settings.saveState': 'Changes are saved automatically',
      'home.greeting': 'Explore geometry',
      'home.title': 'See shapes. Understand space.',
      'home.subtitle': 'Rotate, unfold and learn one step at a time.',
      'home.startLearning': 'Start learning',
      'home.play': 'Play GeoMath',
      'home.guide': 'How to play',
      'home.help': 'Help',
      'help.title': 'Help centre',
      'help.subtitle': 'Quick guidance to keep your learning moving.',
      'help.howToPlay': 'How to play',
      'help.report': 'Report a problem',
      'help.localReport': 'Local report',
      'shape.cube': 'Cube',
      'shape.cuboid': 'Cuboid',
      'shape.pyramid': 'Pyramid',
      'shape.cylinder': 'Cylinder',
      'shape.cone': 'Cone',
      'face.front': 'Front',
      'face.right': 'Right',
      'face.back': 'Back',
      'face.left': 'Left',
      'face.top': 'Top',
      'face.bottom': 'Bottom',
      'model.rotate': 'Rotate',
      'model.reset': 'Reset',
      'model.unfold': 'Unfold',
      'model.fold': 'Fold',
      'model.fullscreen': 'Full screen',
      'model.legend': 'Face colours',
    },
  };
}

final class AppStringsScope extends InheritedWidget {
  const AppStringsScope({
    required this.strings,
    required super.child,
    super.key,
  });

  final AppStrings strings;

  @override
  bool updateShouldNotify(AppStringsScope oldWidget) =>
      strings.language != oldWidget.strings.language ||
      !identical(strings.contributions, oldWidget.strings.contributions);
}

final class _AppStringsDelegate extends LocalizationsDelegate<AppStrings> {
  const _AppStringsDelegate();

  @override
  bool isSupported(Locale locale) => AppStrings.supportedLocales.any(
    (item) => item.languageCode == locale.languageCode,
  );

  @override
  Future<AppStrings> load(Locale locale) => SynchronousFuture(
    AppStrings(locale.languageCode == 'en' ? AppLanguage.en : AppLanguage.ms),
  );

  @override
  bool shouldReload(_AppStringsDelegate old) => false;
}
