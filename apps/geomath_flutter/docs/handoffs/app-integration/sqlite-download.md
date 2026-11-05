# Verified native SQLite downloads in Android CI

Run42025164074 failed before device execution: the locked sqlite3 3.8.0 build
hook rejected the downloaded ARM library SHA256 `bef140a1a96994029153dca8c00b1750b9a5a764fb9db2dc68d7bb40e8a29e8a`.
The required digest remains
`d0d6eeaf4fa1e833c9344dafce3f8cb00c952f633175e1ec224bd6d05fceecf3`.
The unexpected response body and HTTP status were not retained, so their exact
origin is unverified. This failure does not establish an application defect or
an Android device test result.

Inspection of the resolved, locked package shows its downloader streams the
release response into a hash check without explicitly checking HTTP status.
Its shared-cache reuse independently rehashes every existing library. The
[official release metadata](https://github.com/simolus3/sqlite3.dart/releases/tag/sqlite3-3.8.0)
was checked on5November2026: all four required ARM/ARM64/x64 Android and x64
Linux digests match the package's unchanged `asset_hashes.dart` table. The ARM
asset is1,899,528bytes. Previous CI and the separately identified local normal
APK builds passed with those same pins.

`tools/android/prefetch_sqlite_assets.py` reads release/hash information directly
from the resolved locked package. It requests only the official release assets,
checks HTTP200, bounded size, ELF signature and the full unchanged SHA256, then
atomically publishes verified bytes into the hook's existing shared download
cache. Three attempts with bounded backoff handle transient responses. Persistent
failure stops CI. The package source, expected hash, dependency lock and hook
output descriptors remain untouched; the real hook rehashes the bytes again.

The native-library cache contains only these digest-verified library files and
is keyed by OS, architecture, dependency lock and verifier source. It contains no
application SQLite database, account, credential, hook result or test outcome.
The verifier rehashes restored entries before any use. Flutter/pub caches are
saved after dependency/toolchain initialization and before native verification.
Gradle's public dependency/wrapper cache is preserved when a build has attempted
even if that build later fails; its failed outcome remains failed. No Gradle
transform cache, source build output or acceptance result is reused.

Actual local verification:

- Five verifier regression tests pass: corrupt-response retry; persistent
  corruption rejection; interrupted-response retry; rehashed valid-cache reuse;
  corrupt-cache plus HTTP503
  rejection. Persistent failures never publish an artifact.
- The real locked ARM, ARM64 and x64 Android cache entries were rehashed; x64
  Linux was fetched from its official release URL and verified successfully.
- A separate fresh ARM download from the official release succeeded on its
  first attempt:1,899,528bytes, exactly the required unchanged digest. This is
  download verification, not an Android app run.
- YAML parse, restore/save scope and all existing acceptance-gate checks pass.

See [sqlite-native-prefetch.json](evidence/sqlite-native-prefetch.json) for the
actual verified asset bytes/digests and cache paths. No device PASS follows from
this tooling receipt. The next actual Android run remains the device gate.
