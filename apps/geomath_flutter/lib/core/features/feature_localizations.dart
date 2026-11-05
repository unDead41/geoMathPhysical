import '../l10n/app_strings.dart';

/// A feature owns a namespace, such as `learning` or `classroom`.
///
/// Translation keys are local to that namespace. The registry exports the
/// flattened `learning.title` form for the app's single AppStrings instance.
final class FeatureLocalizations {
  FeatureLocalizations({
    required this.namespace,
    required Map<String, Map<String, String>> translations,
  }) : translations = Map.unmodifiable(
         translations.map(
           (locale, values) =>
               MapEntry(locale, Map<String, String>.unmodifiable(values)),
         ),
       );

  final String namespace;
  final Map<String, Map<String, String>> translations;
}

final class FeatureLocalizationRegistry {
  FeatureLocalizationRegistry(Iterable<FeatureLocalizations> contributions) {
    final result = <String, Map<String, String>>{'ms': {}, 'en': {}};
    final namespaces = <String>{};
    for (final contribution in contributions) {
      if (!RegExp(r'^[a-z][a-z0-9_]*$').hasMatch(contribution.namespace)) {
        throw ArgumentError('Invalid localisation namespace');
      }
      if (AppStrings.reservedNamespaces.contains(contribution.namespace)) {
        throw ArgumentError(
          'Reserved localisation namespace: ${contribution.namespace}',
        );
      }
      if (!namespaces.add(contribution.namespace)) {
        throw ArgumentError(
          'Duplicate localisation namespace: ${contribution.namespace}',
        );
      }
      for (final locale in contribution.translations.entries) {
        if (!result.containsKey(locale.key)) {
          throw ArgumentError('Unsupported language: ${locale.key}');
        }
        for (final value in locale.value.entries) {
          if (!RegExp(r'^[A-Za-z][A-Za-z0-9_.]*$').hasMatch(value.key)) {
            throw ArgumentError('Invalid localisation key: ${value.key}');
          }
          result[locale.key]!['${contribution.namespace}.${value.key}'] =
              value.value;
        }
      }
    }
    translations = Map.unmodifiable(
      result.map(
        (locale, values) =>
            MapEntry(locale, Map<String, String>.unmodifiable(values)),
      ),
    );
  }

  late final Map<String, Map<String, String>> translations;

  String? lookup(String language, String key) =>
      translations[language]?[key] ??
      translations['en']?[key] ??
      translations['ms']?[key];
}
