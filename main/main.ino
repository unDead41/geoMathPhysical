// VS Code: buka folder repo + PlatformIO. Arduino IDE: buka fail main.ino ini.
// Semua tab lain mesti kekal dalam folder main.
#include "config.h"

void setup() {
  serialBegin();
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

void loop() {
  serialUpdate();
  buttonsUpdate();
  rfidUpdate();
  appUpdate();
  rgbUpdate();
  lcdUpdate();
  yield(); // Beri peluang kepada tugas sistem ESP32; tiada delay aplikasi.
}
