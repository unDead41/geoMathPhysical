// The real Serial adapter must identify the uploaded build without changing it.
#include "hardware/component_tests.h"
#include "firmware_version.h"

static std::string firmwareLine(const std::string &output) {
  const size_t begin = output.find("[FIRMWARE] GeoDecoder ");
  need(begin != std::string::npos, "firmware version identity is missing");
  const std::string line = output.substr(begin, output.find('\n', begin) - begin);
#if GEODECODER_RGB_ENABLED
  const char *environment = "esp32dev-rgb";
#else
  const char *environment = "esp32dev";
#endif
  const std::string expected = std::string("[FIRMWARE] GeoDecoder v") + GEODECODER_VERSION +
                               " | ESP32 | env=" + environment;
  need(line == expected, "Serial identity disagrees with the canonical version or compiled environment");
  return line;
}

static void version_boot_and_status() {
  fixture();
  const std::string boot = firmwareLine(Serial.output);
  componentSerial("status");
  need(firmwareLine(Serial.output) == boot, "status disagrees with the boot version");
  componentSerial("help");
  need(Serial.output.find("version ") != std::string::npos, "help does not expose version");
}

static void version_uart_preserves_game() {
  fixture();
  const std::string boot = firmwareLine(Serial.output);
  start(); select("P1"); quizOnScan(0, tag(Shape::PYRAMID, 0)); appHintButton();
  need(quizActiveReader() == 1 && quizState().showHint, "R2 hint fixture not established");
  const QuizData quiz = quizState(); const AppState app = appState();
  const RegistryData registry = registryState(); const auto stored = fakeNvs;
  const auto pins = sim::pins; const ScanMode reader = rfidGetMode();
  const uint32_t elapsed = quizElapsedMs();
  componentSerial(" \tVeRsIoN \t");
  need(firmwareLine(Serial.output) == boot, "UART command reports a different firmware");
  need(!memcmp(&quiz, &quizState(), sizeof(quiz)) &&
       !memcmp(&app, &appState(), sizeof(app)), "version changed the running R2/hint state");
  need(!memcmp(&registry, &registryState(), sizeof(registry)) && fakeNvs == stored,
       "version changed saved RFID registrations");
  need(sim::pins == pins && rfidGetMode() == reader && quizElapsedMs() == elapsed,
       "version changed outputs, reader or stopwatch");
}

static void version_diagnostics_and_arguments() {
  fixture(); const std::string boot = firmwareLine(Serial.output);
  componentSerial("test/led/r2/green"); advance(1);
  const auto pins = sim::pins; const auto stored = fakeNvs;
  componentSerial("version");
  need(firmwareLine(Serial.output) == boot && componentTestsActive(),
       "version is unavailable during diagnostics or ended the test");
  componentSerial("status");
  need(firmwareLine(Serial.output) == boot, "diagnostic status lost the version");
  componentSerial("version extra");
  need(Serial.output.find("[ERROR]") != std::string::npos &&
       Serial.output.find("[FIRMWARE]") == std::string::npos,
       "version accepted extra arguments");
  need(componentTestsActive() && sim::pins == pins && fakeNvs == stored,
       "version lookup or invalid arguments changed diagnostics/storage");
  componentSerial("test/stop");
}
