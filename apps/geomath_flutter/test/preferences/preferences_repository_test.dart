import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';

void main() {
  late Directory directory;
  late _FileStore store;

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('geomath_preferences_');
    store = _FileStore(File('${directory.path}/settings.json'));
  });

  tearDown(() async => directory.delete(recursive: true));

  test(
    'all preferences survive a repository close and a fresh disk read',
    () async {
      final repository = (await SharedPreferencesRepository.open(store: store))
          .valueOrNull!;
      const expected = AppPreferences(
        language: AppLanguage.en,
        theme: AppTheme.dark,
        textScale: 1.5,
        strongContrast: true,
        reducedMotion: true,
        musicEnabled: false,
        soundEnabled: false,
        hapticsEnabled: false,
      );
      expect((await repository.save(expected)).isSuccess, isTrue);
      repository.dispose();

      final reopened = (await SharedPreferencesRepository.open(
        store: _FileStore(File(store.file.path)),
      )).valueOrNull!;
      expect(reopened.value, expected);
      reopened.dispose();
    },
  );

  test(
    'legacy schema-v1 settings retain every value and use default haptics',
    () async {
      const legacy = AppPreferences(
        language: AppLanguage.en,
        theme: AppTheme.dark,
        textScale: 1.25,
        strongContrast: true,
        reducedMotion: true,
        soundEnabled: false,
      );
      final legacyJson = legacy.toJson()..remove('hapticsEnabled');
      await store.write(jsonEncode(legacyJson));
      final repository = (await SharedPreferencesRepository.open(store: store))
          .valueOrNull!;
      expect(repository.value, legacy);
      expect(repository.value.hapticsEnabled, isTrue);
      // Reading the additive default never rewrites an existing document.
      expect(jsonDecode((await store.read())!), legacyJson);
      repository.dispose();
    },
  );

  test(
    'pending or failed persistence never publishes a saved snapshot',
    () async {
      final delayed = _ControlledStore();
      final repository = (await SharedPreferencesRepository.open(
        store: delayed,
      )).valueOrNull!;
      var notifications = 0;
      repository.addListener(() => notifications++);
      final change = repository.value.copyWith(theme: AppTheme.dark);
      final saving = repository.save(change);
      await Future<void>.delayed(Duration.zero);
      expect(repository.value.theme, AppTheme.system);
      expect(notifications, 0);

      delayed.pending.completeError(
        FileSystemException('device storage denied'),
      );
      final result = await saving;
      expect(result.failureOrNull?.code, FailureCode.storage);
      expect(repository.value.theme, AppTheme.system);
      expect(notifications, 0);

      delayed.pending = Completer<void>();
      final retry = repository.save(change);
      await Future<void>.delayed(Duration.zero);
      delayed.pending.complete();
      expect((await retry).isSuccess, isTrue);
      expect(repository.value, change);
      expect(notifications, 1);
      repository.dispose();
    },
  );

  test(
    'serialized saves cannot complete out of order or poison later writes',
    () async {
      final delayed = _ControlledStore();
      final repository = (await SharedPreferencesRepository.open(
        store: delayed,
      )).valueOrNull!;
      final first = repository.save(const AppPreferences(theme: AppTheme.dark));
      final second = repository.save(
        const AppPreferences(language: AppLanguage.en),
      );
      await Future<void>.delayed(Duration.zero);
      expect(delayed.writes, 1);
      final secondGate = Completer<void>();
      final firstGate = delayed.pending;
      delayed.pending = secondGate;
      firstGate.completeError(FileSystemException('full'));
      expect((await first).isSuccess, isFalse);
      await Future<void>.delayed(Duration.zero);
      expect(delayed.writes, 2);
      expect(repository.value, const AppPreferences());
      secondGate.complete();
      expect((await second).isSuccess, isTrue);
      expect(repository.value.language, AppLanguage.en);
      repository.dispose();
    },
  );

  test(
    'failed replacement preserves the last durable preferences on reopen',
    () async {
      final repository = (await SharedPreferencesRepository.open(store: store))
          .valueOrNull!;
      const previous = AppPreferences(textScale: 1.25);
      await repository.save(previous);
      store.failWrites = true;
      expect(
        (await repository.save(previous.copyWith(theme: AppTheme.dark)))
            .isSuccess,
        isFalse,
      );
      expect(repository.value, previous);
      repository.dispose();
      final reopened = (await SharedPreferencesRepository.open(store: store))
          .valueOrNull!;
      expect(reopened.value, previous);
      reopened.dispose();
    },
  );

  test(
    'corrupt and future JSON are rejected without overwriting storage',
    () async {
      for (final raw in [
        'broken',
        '[]',
        jsonEncode({...const AppPreferences().toJson(), 'schemaVersion': 2}),
      ]) {
        await store.write(raw);
        final result = await SharedPreferencesRepository.open(store: store);
        expect(result.failureOrNull?.code, FailureCode.storage);
        expect(await store.read(), raw);
      }
    },
  );

  test(
    'JSON validates each field instead of accepting truthy or unknown values',
    () {
      const original = AppPreferences();
      expect(AppPreferences.fromJson(original.toJson()), original);
      for (final entry in <String, Object?>{
        'language': 'de',
        'theme': 'sepia',
        'textScale': 1.1,
        'strongContrast': 'true',
        'reducedMotion': 0,
        'musicEnabled': null,
        'soundEnabled': 'false',
        'hapticsEnabled': null,
      }.entries) {
        expect(
          () => AppPreferences.fromJson({
            ...original.toJson(),
            entry.key: entry.value,
          }),
          throwsFormatException,
          reason: entry.key,
        );
      }
    },
  );
}

final class _FileStore implements PreferencesStore {
  _FileStore(this.file);
  final File file;
  bool failWrites = false;

  @override
  Future<String?> read() async =>
      await file.exists() ? file.readAsString() : null;

  @override
  Future<void> write(String value) async {
    if (failWrites) throw FileSystemException('denied');
    await file.writeAsString(value, flush: true);
  }
}

final class _ControlledStore implements PreferencesStore {
  String? durable;
  Completer<void> pending = Completer<void>();
  int writes = 0;

  @override
  Future<String?> read() async => durable;

  @override
  Future<void> write(String value) async {
    writes++;
    await pending.future;
    durable = value;
  }
}
