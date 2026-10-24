#include "hardware/rgb.h"
#include "config.h"

// LED biasa: satu pin per pembaca. RGB pilihan: R/G/B dengan resistor setiap saluran.
void rgbWriteReader(uint8_t reader, RgbColor color) {
  if (reader >= READER_COUNT) return;
  if (!RGB_ENABLED) {
    digitalWrite(RGB_PINS[reader][0], color == RgbColor::OFF ? LOW : HIGH);
    return;
  }
  const bool on[3] = {
    color == RgbColor::RED || color == RgbColor::YELLOW || color == RgbColor::MAGENTA || color == RgbColor::WHITE,
    color == RgbColor::GREEN || color == RgbColor::YELLOW || color == RgbColor::CYAN || color == RgbColor::WHITE,
    color == RgbColor::BLUE || color == RgbColor::CYAN || color == RgbColor::MAGENTA || color == RgbColor::WHITE
  };
  for (uint8_t channel = 0; channel < 3; ++channel)
    digitalWrite(RGB_PINS[reader][channel], (on[channel] != RGB_COMMON_ANODE) ? HIGH : LOW);
}

void rgbBegin() {
  for (uint8_t reader = 0; reader < READER_COUNT; ++reader) {
    const uint8_t channels = RGB_ENABLED ? 3 : 1;
    for (uint8_t channel = 0; channel < channels; ++channel)
      pinMode(RGB_PINS[reader][channel], OUTPUT);
    rgbWriteReader(reader, RgbColor::OFF);
  }
}

