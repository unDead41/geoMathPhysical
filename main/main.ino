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
  appHandleScan(reader, uid);
}
}

void setup() {
  serialBegin();
  appBindPorts({platformNow, platformRandom, serialLog, nvsStoragePort(),
                rfidSetMode, rfidRequireFreshCards, platformReaderOnline, rfidReaderEnabled});
  hardwareBindInputs({appNextButton, appHintButton, appInputBlocked, platformScan});
  registryBegin();
  quizBegin();
  rfidBegin();
  buttonsBegin();
  rgbBegin();
  lcdBegin();
  appBegin();
  serialPrintHelp();
  registryPrintActive();
}
void rgbUpdate() {
  for (uint8_t reader = 0; reader < READER_COUNT; ++reader)
    rgbWriteReader(reader, appReaderColor(reader));
}
void lcdUpdate() {
  if (!lcdIsReady()) return;
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

