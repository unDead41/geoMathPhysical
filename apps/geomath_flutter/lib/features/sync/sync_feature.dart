import '../../app/app_dependencies.dart';
import '../../core/features/feature_contribution.dart';
import '../../core/records/formative_records.dart';
import '../auth/auth_services.dart';
import '../auth/data/cloud_gateway.dart';
import 'application/formative_sync_controller.dart';
import 'data/sqlite_formative_outbox.dart';
import 'data/sync_formative_record_writer.dart';
import 'data/sync_receipt_schema.dart';
import 'presentation/sync_screen.dart';

export 'application/formative_sync_controller.dart';
export 'data/sqlite_formative_outbox.dart';
export 'data/sync_formative_record_writer.dart';
export 'data/sync_receipt_schema.dart';

abstract final class SyncServices {
  static const outbox = ServiceKey<SqliteFormativeOutbox>('sync.outbox');
  static const writer = ServiceKey<SyncFormativeRecordWriter>('sync.writer');
  static const controller = ServiceKey<FormativeSyncController>(
    'sync.controller',
  );
}

/// The optional gateway is an explicit injection seam for transport tests.
/// Production resolves the verified Auth gateway lazily, after root bootstrap.
FeatureContribution syncFeature({CloudGateway? gateway}) => FeatureContribution(
  id: 'sync',
  migrations: [SyncReceiptSchema.migration],
  routes: [
    FeatureRoute(
      name: 'sync.pending',
      path: '/sync',
      builder: (context, services) => SyncScreen(
        controller: services.get(SyncServices.controller),
        onBack: () => AppScope.of(context).router.back(),
        onSignIn: () => AppScope.of(context).router.open('cloud-game-login'),
      ),
    ),
  ],
  localizations: [
    FeatureLocalizations(namespace: 'sync', translations: syncTranslations),
  ],
  services: [
    // Root resolves this before app.records exists. Borrow only these two keys.
    ServiceFactory(
      key: SyncServices.outbox,
      createService: (services) => SqliteFormativeOutbox(
        database: services.get(FoundationServices.database),
        sessions: services.get(FoundationServices.sessions),
      ),
    ),
    ServiceFactory<FormativeOutboxAppender>(
      key: FoundationExtensions.formativeOutbox,
      createService: (services) => services.get(SyncServices.outbox),
    ),
    ServiceFactory(
      key: SyncServices.writer,
      createService: (services) {
        final shared = services.get(FoundationServices.recordsReader);
        if (shared is! FormativeRecordWriter) {
          throw StateError('Shared formative writer is unavailable.');
        }
        return SyncFormativeRecordWriter(
          delegate: shared as FormativeRecordWriter,
          sessions: services.get(FoundationServices.sessions),
          outbox: services.get(SyncServices.outbox),
        );
      },
      dispose: (writer) => writer.dispose(),
    ),
    ServiceFactory<FormativeRecordWriter>(
      key: FoundationExtensions.recordsWriter,
      createService: (services) => services.get(SyncServices.writer),
    ),
    ServiceFactory(
      key: SyncServices.controller,
      createService: (services) => FormativeSyncController(
        outbox: services.get(SyncServices.outbox),
        gateway: gateway ?? services.get(AuthServices.gateway),
        sessions: services.get(FoundationServices.sessions),
        writer: services.get(SyncServices.writer),
        lifecycle: services.get(FoundationServices.lifecycle),
        clock: services.get(FoundationServices.clock),
        random: services.get(FoundationServices.random),
      ),
      dispose: (controller) => controller.dispose(),
    ),
  ],
);

const syncTranslations = {
  'ms': {
    'title': 'Rekod dan penyelarasan',
    'intro': 'Refleksi dan keputusan solo ialah rekod latihan kendiri, bukan markah kelas atau Duel.',
    'pending': '{count} rekod menunggu penghantaran',
    'unsaved': '{count} rekod belum disimpan pada peranti. Kekalkan app terbuka dan cuba semula.',
    'retry': 'Cuba semula',
    'signIn': 'Log masuk semula',
    'awaiting': 'Menunggu',
    'mode.quiz': 'Kuiz',
    'mode.practice': 'Latihan',
    'mode.review': 'Semakan',
    'history': 'Lihat sejarah awan',
    'historyTitle': 'Sejarah awan baca sahaja',
    'historyNotice': 'Rekod kendiri tidak disahkan. Senarai ini memerlukan akses akaun semasa.',
    'historyError':
        'Sejarah tidak dapat dibaca. Semak sambungan atau log masuk semula.',
    'historyEmpty': 'Belum ada sejarah solo dalam awan.',
    'module': 'Refleksi modul',
    'solo': 'Keputusan solo',
    'more': 'Menunjukkan {count} rekod terawal. Baki dihantar dalam kelompok seterusnya.',
    'retryAt': 'Penghantaran seterusnya selepas {time}.',
    'status.local': 'Tersimpan setempat; tetamu tidak memuat naik rekod.',
    'status.pending': 'Menunggu penghantaran. Rekod kekal pada peranti.',
    'status.syncing': 'Menghantar rekod kepada pemilik akaun semasa…',
    'status.synced':
        'Semua penghantaran telah diakui; tiada rekod belum disimpan.',
    'status.needsAuth':
        'Log masuk semula dengan akaun yang sama untuk menghantar rekod.',
    'status.unavailable':
        'Perkhidmatan penyelarasan belum tersedia. Rekod menunggu dikekalkan.',
    'status.blocked': 'Penghantaran dihentikan kerana rekod tidak diterima. Rekod asal dikekalkan.',
    'status.storageFailed':
        'Storan gagal atau penuh. Rekod belum disimpan tidak dianggap selamat.',
    'status.stopped':
        'Percubaan automatik dihentikan. Semak sambungan dan cuba semula.',
  },
  'en': {
    'title': 'Records and sync',
    'intro': 'Reflections and solo results are self-study records, separate from classroom or Duel marks.',
    'pending': '{count} records awaiting delivery',
    'unsaved': '{count} records are not saved on this device. Keep the app open and retry.',
    'retry': 'Retry',
    'signIn': 'Sign in again',
    'awaiting': 'Pending',
    'mode.quiz': 'Quiz',
    'mode.practice': 'Practice',
    'mode.review': 'Review',
    'history': 'View cloud history',
    'historyTitle': 'Read-only cloud history',
    'historyNotice': 'Unverified self-study records. This list requires access through the current account.',
    'historyError':
        'History could not be read. Check the connection or sign in again.',
    'historyEmpty': 'No solo cloud history yet.',
    'module': 'Module reflection',
    'solo': 'Solo result',
    'more': 'Showing the first {count} records. Remaining records follow in later batches.',
    'retryAt': 'Next delivery after {time}.',
    'status.local': 'Saved locally; guest records are not uploaded.',
    'status.pending': 'Awaiting delivery. Records remain on this device.',
    'status.syncing': 'Sending records for the current account…',
    'status.synced':
        'All delivery was acknowledged; no unsaved records remain.',
    'status.needsAuth': 'Sign in to the same account to deliver these records.',
    'status.unavailable': 'Sync is not available. Pending records were kept.',
    'status.blocked': 'Delivery stopped because a record was rejected. Original records were kept.',
    'status.storageFailed':
        'Storage failed or is full. Unsaved records are not durable.',
    'status.stopped':
        'Automatic retries stopped. Check the connection and retry.',
  },
};
