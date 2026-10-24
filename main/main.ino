// Composition root: bind adapters once, then drive the same modules for both IDEs.
#include "config.h"
#include "application/runtime.h"
#include "application/app.h"
#include "application/ports.h"
#include "application/quiz.h"
#include "application/registry.h"
#include "hardware/inputs.h"
#include "hardware/rfid.h"
#include "hardware/buttons.h"
#include "hardware/rgb.h"
#include "hardware/lcd.h"
#include "hardware/storage.h"
#include "hardware/component_tests.h"
#include "presentation/serial_commands.h"
#include "presentation/lcd_view.h"

namespace {
uint32_t platformNow() { return millis(); }
uint8_t platformRandom(uint8_t upperExclusive) { return uint8_t(random(upperExclusive)); }
bool platformReaderOnline(uint8_t reader) {
  return reader < READER_COUNT && rfidGetRecord(reader).online;
}
void platformScan(uint8_t reader, const Uid &uid) {
  serialPrintUid(reader);
  if (!componentTestsActive()) appHandleScan(reader, uid);
}
bool platformButtonsBlocked() { return componentTestsActive() || appInputBlocked(); }
}

void setup() {
  serialBegin();
  appBindPorts({platformNow, platformRandom, serialLog, nvsStoragePort(),
                rfidSetMode, rfidRequireFreshCards, platformReaderOnline, rfidReaderEnabled});
  hardwareBindInputs({appNextButton, appHintButton, platformButtonsBlocked, platformScan});
  registryBegin();
  quizBegin();
  rfidBegin();
  buttonsBegin();
  rgbBegin();
  componentTestsBegin();
  lcdBegin();
  appBegin();
  serialPrintHelp();
  registryPrintActive();
}
void rgbUpdate() {
  componentTestsUpdate();
  for (uint8_t reader = 0; reader < READER_COUNT; ++reader)
    rgbWriteReader(reader, componentTestsActive() ? componentTestsReaderColor(reader) : appReaderColor(reader));
}
void lcdUpdate() {
  if (!lcdIsReady()) return;
  if (componentTestsActive()) { lcdRender(componentTestsLcdFrame()); return; }
  const bool ready = platformReaderOnline(0) && platformReaderOnline(1) && registryActiveReady();
  lcdRender(buildLcdFrame({appState(), quizState(), quizCurrentQuestion(),
                          quizElapsedMs(), ready, rfidGetLastReader()}));
}
void loop() {
  serialUpdate();
  buttonsUpdate();
  rfidUpdate();
  appUpdate();
  rgbUpdate();
  lcdUpdate();
  yield();
}

