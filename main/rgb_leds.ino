// LED biasa: satu pin per pembaca. RGB pilihan: R/G/B dengan resistor setiap saluran.
void rgbWriteReader(uint8_t reader, RgbColor color) {
  if (reader >= READER_COUNT) return;
  if (!RGB_ENABLED) {
    digitalWrite(RGB_PINS[reader][0], color == RgbColor::OFF ? LOW : HIGH);
    return;
  }
  const bool on[3] = {color == RgbColor::RED, color == RgbColor::GREEN, color == RgbColor::BLUE};
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

void rgbUpdate() {
  for (uint8_t reader = 0; reader < READER_COUNT; ++reader) {
    RgbColor color = quizReaderColor(reader);
    if (appMode == AppMode::ENROLL)
      color = reader == uint8_t(enrollReader) ? RgbColor::BLUE : RgbColor::OFF;
    else if (appMode == AppMode::UID_SCAN)
      color = rfidReaderEnabled(reader) ? RgbColor::BLUE : RgbColor::OFF;
    rgbWriteReader(reader, color);
  }
}
