#include "hardware/buttons.h"
#include "hardware/inputs.h"
#include "config.h"

namespace {
bool buttonLastRaw[2] = {}, buttonStable[2] = {};
bool buttonSuppressed[2] = {};
uint32_t buttonChangedMs[2] = {};

}

void buttonsBegin() {
  for (uint8_t i = 0; i < 2; ++i) {
    // Active LOW: idle HIGH. Active HIGH: idle LOW.
    pinMode(BUTTON_PINS[i], BUTTON_PRESSED_LEVEL[i] == LOW ? INPUT_PULLUP : INPUT_PULLDOWN);
    buttonLastRaw[i] = buttonStable[i] = digitalRead(BUTTON_PINS[i]);
    buttonSuppressed[i] = false;
    buttonChangedMs[i] = millis();
  }
}

bool buttonIsPressed(uint8_t reader) {
  return reader < 2 && buttonStable[reader] == BUTTON_PRESSED_LEVEL[reader];
}
void buttonsRequireRelease() {
  for (uint8_t i = 0; i < 2; ++i) buttonSuppressed[i] = true;
}

void buttonsUpdate() {
  const uint32_t now = millis();
  // Snapshot before dispatch: NEXT may open a question before HINT is sampled.
  const bool blocked[2] = {
    hardwareInputs().buttonsBlocked && hardwareInputs().buttonsBlocked(0),
    hardwareInputs().buttonsBlocked && hardwareInputs().buttonsBlocked(1)
  };
  for (uint8_t i = 0; i < 2; ++i) {
    const bool raw = digitalRead(BUTTON_PINS[i]);
    if (raw != buttonLastRaw[i]) { buttonLastRaw[i] = raw; buttonChangedMs[i] = now; }
    const bool pressed = raw == BUTTON_PRESSED_LEVEL[i];
    // Ingat bahawa tekanan ini berlaku semasa notis, walaupun debounce selesai
    // selepas soalan bertukar atau keputusan akhir sudah dipaparkan.
    if (pressed && blocked[i])
      buttonSuppressed[i] = true;
    // Lepasan stabil juga membersihkan tekanan pendek yang belum sempat didebounce.
    if (!pressed && uint32_t(now - buttonChangedMs[i]) >= BUTTON_DEBOUNCE_MS)
      buttonSuppressed[i] = false;
    if (raw != buttonStable[i] && uint32_t(now - buttonChangedMs[i]) >= BUTTON_DEBOUNCE_MS) {
      buttonStable[i] = raw;
      // Satu tindakan semasa ditekan stabil, bukan ketika dilepaskan.
      if (buttonIsPressed(i) && !buttonSuppressed[i]) {
        if (i == 0 && hardwareInputs().next) hardwareInputs().next();
        else if (i == 1 && hardwareInputs().hint) hardwareInputs().hint();
      }
    }
  }
}

