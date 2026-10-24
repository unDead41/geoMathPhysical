#include "hardware/lcd.h"
#include "config.h"
#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>
#include <cstring>

namespace {
hd44780_I2Cexp lcd;
bool lcdReady = false;
char lcdPrevious[4][21] = {};
}
void lcdBegin() {
  lcdReady = false;
  memset(lcdPrevious, 0, sizeof(lcdPrevious));
  if (!Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN, LCD_I2C_CLOCK_HZ)) {
    Serial.println(F("[LCD] I2C gagal; Serial dan RFID diteruskan.")); return;
  }
  Wire.setTimeOut(25);
  const int code = lcd.begin(LCD_COLUMNS, LCD_ROWS);
  lcdReady = code == 0;
  if (lcdReady) { lcd.backlight(); lcd.noCursor(); lcd.noBlink(); }
  else Serial.printf("[LCD] Gagal, kod=%d. Semak aras logik, I2C dan kontras.\n", code);
}

bool lcdIsReady() { return lcdReady; }


void lcdRender(const LcdFrame &frame) {
  if (!lcdReady) return;
  // Write changed rows only; no clear/delay or gameplay decisions in this driver.
  for (uint8_t r = 0; r < 4; ++r) {
    if (memcmp(frame.rows[r], lcdPrevious[r], 21) == 0) continue;
    lcd.setCursor(0, r); lcd.print(frame.rows[r]);
    memcpy(lcdPrevious[r], frame.rows[r], 21);
  }
}

