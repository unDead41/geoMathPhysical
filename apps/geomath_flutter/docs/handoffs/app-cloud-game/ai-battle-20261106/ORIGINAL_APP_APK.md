# Lawan AI in the original GeoMath application

Packaging correction requested on 6 November 2026. **Lawan AI is an additional feature of the existing GeoMath app.** It is registered through the production Solo contribution and Main entry; it does not require another app or a second backend. The earlier separate-package preview was a packaging workaround for an observed signing conflict, not an architectural requirement.

The preferred new artifact is **GeoMath-0.2.1-Lengkap-arm64.apk**. Its launcher is **GeoMath**, its original application ID is **com.geomath.dev**, and its original authentication VIEW filter is retained. Duel, classroom, profile, Solo, learning and AI remain in this same app. Select **Main → Lawan AI**.

## Exact build

- Source: `app-cloud-game` commit `57c0c1b1f1444cb136dc37f66bacd8cdb50d0d61`; runtime source `ec578641a3e33e167c23aab85780550d7575f6e0`.
- No Dart, asset, tracked Android runner, dependency or production source change was required. The build uses the original Android files directly, without the preview's package/label/filter substitutions.
- Build-name `0.2.1`, configured build-number `3`, ARM64 split Android versionCode `2003`. Source pubspec remains `0.1.0+1`; these are explicit artifact build overrides.
- Release mode with the existing development signing key; ARM64 only, minimum API 24.
- APK size: 21,256,039 bytes. SHA256: `f3b13859dd1f2707c9e6e339d4b3b3b4ad034f104430af645c6c8f134a8801f5`.
- All 158 tested Dart/asset fingerprints and all 19 tracked Android files are unchanged. The same Dart/assets previously passed 598 Flutter tests; this packaging correction did not rerun that unchanged suite.
- The new APK build, v2 signature, original manifest identity/filter, ZIP CRC, bundled asset bytes and source/dependency fingerprints passed verification. No physical-phone installation or in-place update was executed here.

See [build inputs](evidence/original-app-build-inputs.json), [APK verification](evidence/original-app-apk-verification.json), [signature](evidence/original-app-apk-signature.txt), [build log](evidence/original-app-build.log), and [delivery hashes](evidence/original-app-delivery-files.json). Reproduction recipes: [build](evidence/build_original_app.py.txt) and [verify](evidence/verify_original_app.py.txt). Text logs normalize terminal trailing whitespace only.

The build is pinned to the named cloud/game source. This follow-up does not merge another branch or claim a new UI-refinement integration.

## In-place update and the original signing key

Android requires a matching signing identity to update an installed application and retain its data. The same application name and package are necessary but do not replace that signing check.

| Inspected artifact | Certificate SHA256 | Same signer as this new APK |
| --- | --- | --- |
| GeoMath-Duel-Class-Profile-Debug.apk, version 0.1.0 | `efcb365de2071ebfbc71d5650d966f284809197f207cd013f8ae738d02765631` | No |
| GeoMath-0.2.0-arm64-debug.apk, version 0.2.0 | `73f7dfb6f845b2ca669687adcb8402142696f89116d8b1f47c0ce3d93a6c8d40` | Yes |
| This GeoMath 0.2.1 build | `73f7dfb6f845b2ca669687adcb8402142696f89116d8b1f47c0ce3d93a6c8d40` | — |

The installed phone's certificate is unknown; it was not inspected. The private keystore matching the inspected 0.1.0 APK is not available in the scoped build workspace. An APK contains the public certificate, not the original private signing key. Accordingly, this artifact **cannot be promised as an in-place update over every old APK**, including the inspected differently signed 0.1.0 artifact.

If the installed app was built using the original PC's debug keystore, that same PC/key can sign the update. Otherwise the original custom keystore is required. Do not generate a replacement key and expect it to match the old certificate. There is no instruction here to uninstall, clear application data, downgrade, bypass signing, or change the package again. Keep the installed app until the matching-key update path is established.

The earlier **GeoMath AI** preview remains a historical separately identified artifact. This new preferred build uses the original application identity. Hosted acceptance and the existing native Google callback gate remain as documented in the original AI handoff.
