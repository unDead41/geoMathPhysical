import 'app_database.dart';

final class MigrationContribution {
  const MigrationContribution({
    required this.namespace,
    required this.version,
    required this.description,
    required this.migrate,
  });

  final String namespace;
  final int version;
  final String description;
  final Future<void> Function(AppTransaction transaction) migrate;

  String get id => '$namespace:$version';
}

/// A single deterministic registry shared by root and preview compositions.
final class MigrationRegistry {
  MigrationRegistry(Iterable<MigrationContribution> migrations) {
    final sorted = migrations.toList()
      ..sort((a, b) {
        final namespaceOrder = a.namespace.compareTo(b.namespace);
        return namespaceOrder == 0
            ? a.version.compareTo(b.version)
            : namespaceOrder;
      });
    final latest = <String, int>{};
    for (final migration in sorted) {
      if (!RegExp(r'^[a-z][a-z0-9_]{0,63}$').hasMatch(migration.namespace) ||
          migration.version < 1 ||
          migration.description.trim().isEmpty) {
        throw ArgumentError('Migration metadata is invalid.');
      }
      final previous = latest[migration.namespace] ?? 0;
      if (migration.version <= previous) {
        throw ArgumentError('Duplicate migration ${migration.id}.');
      }
      if (migration.version != previous + 1) {
        throw ArgumentError('Migration versions must be contiguous from 1.');
      }
      latest[migration.namespace] = migration.version;
    }
    contributions = List.unmodifiable(sorted);
  }

  late final List<MigrationContribution> contributions;
}
