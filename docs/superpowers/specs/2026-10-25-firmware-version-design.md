# Firmware version and release SOR

The user needs a visible `vMAJOR.MINOR.PATCH` on GitHub and on the connected
ESP32 so the source and uploaded firmware can be compared. Start at `v1.0.0`;
earlier commits remain historical, unversioned work.

Use `main/firmware_version.h` as the only runtime version source. The Serial
adapter prints it at startup, for `version`, and with `status`, together with
the compiled LED environment. These read-only paths remain available during
component diagnostics and cannot change the quiz, saved cards or GPIO output.

Keep the current version visible in README and the first versioned changelog
entry. A small standard-library Python check rejects disagreement and malformed
numbers; the existing test runner calls it. Record the future release rules in
`docs/SOR_VERSIONING.md` and require contributors to read them in AGENTS.md.

This uses the existing Serial adapter rather than introducing generated build
files or a second firmware entry point. A build-only generator would miss
Arduino-tab builds; copied runtime version strings would drift. No new runtime
dependency, storage migration, question selection or GPIO change is needed.

GitHub identity is the README/changelog version at the published commit. A tag
or GitHub Release, if created, must use the same label; do not imply a tag exists
without verifying it. Pull updates the PC; Build and Upload update the ESP32.
