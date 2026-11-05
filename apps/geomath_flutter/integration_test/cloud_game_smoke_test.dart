import 'classroom_contract_test.dart' as classroom;
import 'cloud_game_preview_test.dart' as preview;
import 'solo_reopen_test.dart' as solo;
import 'sync_storage_test.dart' as sync;

/// One Android process for the real native SQLite, protected-store/bootstrap,
/// durable Solo and widget contracts. Scripted server projections stay labelled
/// inside their source suites and do not establish hosted service availability.
void main() {
  preview.main();
  solo.main();
  sync.main();
  classroom.main();
}
