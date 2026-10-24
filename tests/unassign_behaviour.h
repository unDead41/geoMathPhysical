// Real Serial parsing, registry persistence and application transitions.
#include "application/ports.h"

// Catches deleting only R1, deleting other shapes, or losing active selection.
static void unassign_shape_pairs() {
  const char *names[] = {"kubus", "piramid", "silinder", "kon", "kuboid",
                         "cube", "pyramid", "cylinder", "cone", "cuboid", "kubu"};
  const uint8_t shapes[] = {0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0};
  for (unsigned i = 0; i < sizeof(shapes); ++i) {
    fixture(); start();
    RegistryData expected = registryState();
    expected.tags[shapes[i]][0] = {}; expected.tags[shapes[i]][1] = {};
    char text[40]; snprintf(text, sizeof(text), "unassign %s", names[i]); command(text);
    need(!memcmp(&expected, &registryState(), sizeof(expected)), "shape command must remove only its R1/R2 pair");
    need(appState().mode == AppMode::STOPPED && quizState().length == 0, "pair removal kept the old round");
    registryBegin();
    need(!memcmp(&expected, &registryState(), sizeof(expected)), "removed pair returned after NVS reload");
  }
}

// Catches flash erase, incomplete clearing, UART routing and stale play state.
static void unassign_all_uart_and_reload() {
  fixture(); command("use kubus piramid silinder"); start();
  const std::vector<uint8_t> unrelated = {9, 8, 7}; fakeNvs["other/settings"] = unrelated;
  RegistryData expected = registryState(); memset(expected.tags, 0, sizeof(expected.tags));
  for (char c : std::string("  UnAsSiGn\tALL  \r\n")) Serial.input.push_back(c);
  while (Serial.available()) serialUpdate();
  need(!memcmp(&expected, &registryState(), sizeof(expected)), "unassign all must clear exactly the ten tag slots");
  need(fakeNvs["other/settings"] == unrelated, "unassign all erased unrelated NVS data");
  need(appState().mode == AppMode::STOPPED && quizState().length == 0 &&
       rfidGetMode() == ScanMode::STOPPED && !quizState().clockRunning, "clear kept a stale quiz or active reader");
  registryBegin();
  need(!memcmp(&expected, &registryState(), sizeof(expected)), "cleared tags returned after reload");
  need(!appPlay(false), "play accepted missing active tags");
  Serial.output.clear(); command("tags");
  size_t count = 0, at = 0;
  while ((at = Serial.output.find("BELUM DAFTAR", at)) != std::string::npos) { ++count; at += 12; }
  need(count == 10, "tags did not report ten empty registrations");
  Serial.output.clear(); command("unassign all");
  need(Serial.output.find("[ERROR]") == std::string::npos, "repeating an empty clear should succeed");
  const Uid uid = {4, {4, 0x99, 0x88, 0x77}};
  need(registryAssign(0, Shape::CUBE, uid), "enrolment failed after clearing all tags");
}

// Catches accepting failed/short writes or discarding the quiz before a save.
static void unassign_failed_storage() {
  for (const char *text : {"unassign all", "unassign piramid"}) {
    for (unsigned shortWrite = 0; shortWrite < 2; ++shortWrite) {
      fixture(); start(); const RegistryData before = registryState(); const auto saved = fakeNvs;
      sim::nvsWriteOk = shortWrite != 0; sim::nvsShortWrite = shortWrite != 0;
      Serial.output.clear(); command(text);
      need(!memcmp(&before, &registryState(), sizeof(before)) && fakeNvs == saved, "failed clear changed mapping");
      need(appState().mode == AppMode::PLAY && quizState().length == 5 && quizState().clockRunning,
           "failed clear discarded a live round");
      need(Serial.output.find("NVS") != std::string::npos && Serial.output.find("[SAVED]") == std::string::npos,
           "failed clear did not report the storage failure");
    }
    fixture(); sim::nvsAvailable = false; registryBegin(); appInspect(ScanMode::BOTH);
    const RegistryData before = registryState(); const auto saved = fakeNvs;
    Serial.output.clear(); command(text);
    need(!memcmp(&before, &registryState(), sizeof(before)) && fakeNvs == saved &&
         appState().mode == AppMode::UID_SCAN && Serial.output.find("NVS") != std::string::npos,
         "unavailable NVS accepted clear or changed mode");
  }
}

// Catches malformed/extra arguments becoming destructive requests; protects old syntax.
static void unassign_invalid_and_legacy() {
  fixture(); start(); const RegistryData before = registryState(); const auto saved = fakeNvs;
  const char *invalid[] = {"unassign", "unassign unknown", "unassign all kubus", "unassign kubus piramid",
    "unassign r3 kubus", "unassign r1 all", "unassign kubus extra", "unassign r1 kubus extra"};
  for (const char *text : invalid) {
    Serial.output.clear(); command(text);
    need(Serial.output.find("[ERROR]") != std::string::npos, "invalid unassign was not rejected");
    need(!memcmp(&before, &registryState(), sizeof(before)) && fakeNvs == saved &&
         appState().mode == AppMode::PLAY && quizState().length == 5, "invalid unassign changed tags or round");
  }
  RegistryData expected = before; expected.tags[0][0] = {}; command("unassign r1 kubus");
  need(!memcmp(&expected, &registryState(), sizeof(expected)), "legacy R1 removal changed another slot");
  expected.tags[0][1] = {}; command("unassign r2 cube");
  need(!memcmp(&expected, &registryState(), sizeof(expected)), "legacy R2 removal stopped working");
}

// Catches pending enrolment restoring a tag immediately after clearing it.
static void unassign_cancels_capture() {
  for (const char *mode : {"assign r1 kubus", "check uid"}) {
    for (const char *text : {"unassign all", "unassign kubus"}) {
      fixture(); command(mode); command(text);
      need(appState().mode == AppMode::STOPPED && appState().enrollReader == -1 &&
           rfidGetMode() == ScanMode::STOPPED, "clear left enrolment or inspection active");
      const RegistryData before = registryState(); const Uid uid = {4, {4, 0x99, 0x88, 0x77}};
      appHandleScan(0, uid);
      need(!memcmp(&before, &registryState(), sizeof(before)), "cancelled capture re-enrolled a cleared tag");
    }
  }
}

namespace unassignStorageTest {
size_t writes = 0;
size_t (*originalWrite)(const RegistryData &) = nullptr;
size_t firstWriteOnly(const RegistryData &data) {
  if (++writes > 1) return 0;
  return originalWrite(data);
}
}
// An adapter accepting only the first write catches a loop of partial commits.
static void unassign_single_commit() {
  for (const char *text : {"unassign all", "unassign silinder"}) {
    fixture(); RegistryData expected = registryState();
    if (!strcmp(text, "unassign all")) memset(expected.tags, 0, sizeof(expected.tags));
    else { expected.tags[2][0] = {}; expected.tags[2][1] = {}; }
    const AppPorts original = appPorts(); AppPorts ports = original;
    unassignStorageTest::writes = 0; unassignStorageTest::originalWrite = original.storage.write;
    ports.storage.write = unassignStorageTest::firstWriteOnly; appBindPorts(ports);
    command(text); appBindPorts(original);
    need(!memcmp(&expected, &registryState(), sizeof(expected)), "clear used partial slot-by-slot commits");
    need(unassignStorageTest::writes == 1, "clear must save all affected slots in one NVS write");
    registryBegin();
    need(!memcmp(&expected, &registryState(), sizeof(expected)), "single commit did not persist complete clear");
  }
}
