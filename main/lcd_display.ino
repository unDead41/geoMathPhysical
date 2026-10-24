hd44780_I2Cexp lcd;
bool lcdReady = false;
char lcdPrevious[4][21] = {};

const char *const LCD_INSTRUCTIONS[INSTRUCTION_PAGE_COUNT][2] = {
  {"5 soalan. Pilih satu", "jawapan dan imbas."},
  {"Imbas bongkah atau", "bentangan ikut LED."},
  {"HINT: Lihat petunjuk", "HINT lagi: Soalan"},
  {"NEXT: Langkau soalan", "Langkau: +0 markah"},
  {"Betul: +1 markah", "Masa terus berjalan"},
  {"Keputusan dipaparkan", "selepas 5 soalan."}
};

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

void lcdPutRow(char rows[4][21], uint8_t row, const char *text) {
  if (row >= 4 || !text) return;
  size_t n = strlen(text); if (n > 20) n = 20;
  memcpy(rows[row], text, n);
}

void lcdPutCentered(char rows[4][21], uint8_t row, const char *text) {
  if (row >= 4 || !text) return;
  size_t n = strlen(text); if (n > 20) n = 20;
  memcpy(rows[row] + (20 - n) / 2, text, n);
}

void lcdMenu(char rows[4][21]) {
  if (appShowInstructions) {
    const uint8_t page = appInstructionPage < INSTRUCTION_PAGE_COUNT ? appInstructionPage : 0;
    char title[21];
    snprintf(title, sizeof(title), "CARA MAIN %u/%u", unsigned(page + 1), unsigned(INSTRUCTION_PAGE_COUNT));
    lcdPutRow(rows, 0, title);
    lcdPutRow(rows, 1, LCD_INSTRUCTIONS[page][0]);
    lcdPutRow(rows, 2, LCD_INSTRUCTIONS[page][1]);
    // Lima halaman pertama tidak memaparkan "HINT: Seterusnya".
    if (page + 1 == INSTRUCTION_PAGE_COUNT) lcdPutRow(rows, 3, "HINT: Menu utama");
    return;
  }
  lcdPutCentered(rows, 0, "GeoDecoder");
  lcdPutCentered(rows, 1, (!rfidGetRecord(0).online || !rfidGetRecord(1).online || !registryActiveReady())
                 ? "Minta bantuan guru" : "Jom uji minda 3D!");
  lcdPutRow(rows, 2, "NEXT: Mula bermain");
  lcdPutRow(rows, 3, "HINT: Cara bermain");
}

void lcdQuizHeader(char rows[4][21]) {
  char text[21], duration[16];
  snprintf(text, sizeof(text), "Q%u/%u", unsigned(quiz.index + 1), unsigned(quiz.length));
  lcdPutRow(rows, 0, text);
  quizFormatTime(duration, sizeof(duration));
  const size_t n = strlen(duration);
  // Normal: Q1/5____00:14___S0/5. Minit lebih panjang menggunakan sela lebih pendek.
  const size_t position = n <= 5 ? 8 : 8 - (n - 4) / 2;
  if (position + n <= 16) memcpy(rows[0] + position, duration, n);
  snprintf(text, sizeof(text), "S%u/%u", unsigned(quiz.score), unsigned(quiz.length));
  const size_t scoreLength = strlen(text);
  if (scoreLength <= 20) memcpy(rows[0] + 20 - scoreLength, text, scoreLength);
}

void lcdQuizBody(char rows[4][21], const Question &q) {
  if (quiz.feedback == Feedback::RIGHT || quiz.feedback == Feedback::SKIPPED) {
    lcdPutRow(rows, 1, quiz.feedback == Feedback::RIGHT ? "Jawapan betul!" : "Soalan dilangkau.");
    lcdPutRow(rows, 2, quiz.feedback == Feedback::RIGHT ? "Markah: +1" : "Markah: +0");
    lcdPutRow(rows, 3, quiz.index + 1 == quiz.length ? "Pusingan selesai." : "Ke soalan seterusnya");
  } else if (quiz.feedback == Feedback::WRONG) {
    lcdPutRow(rows, 1, "Salah, cuba lagi.");
    lcdPutRow(rows, 2, "Pilih jawapan lain.");
    lcdPutRow(rows, 3, "Angkat kad & imbas.");
  } else if (quiz.feedback == Feedback::UNKNOWN_UID) {
    lcdPutRow(rows, 1, "Kad belum didaftar");
    lcdPutRow(rows, 2, "Minta bantuan guru");
    lcdPutRow(rows, 3, "Cuba kad yang sah.");
  } else if (quiz.feedback == Feedback::WRONG_PAD) {
    lcdPutRow(rows, 1, "Ikut LED menyala.");
    lcdPutRow(rows, 2, "Pilih kad yang betul");
    lcdPutRow(rows, 3, "Angkat kad & imbas.");
  } else {
    for (uint8_t r = 0; r < 3; ++r) lcdPutRow(rows, r + 1, quiz.showHint ? q.hint[r] : q.lines[r]);
  }
}

void lcdUpdate() {
  if (!lcdReady) return;
  char rows[4][21], text[80];
  memset(rows, ' ', sizeof(rows));
  for (uint8_t r = 0; r < 4; ++r) rows[r][20] = '\0';
  if (appMode == AppMode::ENROLL) {
    lcdPutCentered(rows, 0, "GeoDecoder");
    lcdPutCentered(rows, 1, shapeLabel(enrollShape));
    lcdPutRow(rows, 2, enrollReader == 0 ? "Imbas kad bongkah" : "Imbas kad bentangan");
    lcdPutRow(rows, 3, "NEXT: Batal daftar");
  } else if (appMode == AppMode::UID_SCAN) {
    lcdPutCentered(rows, 0, "GeoDecoder");
    lcdPutCentered(rows, 1, rfidGetLastReader() < 0 ? "Semakan kad" : "Kad berjaya dibaca");
    lcdPutRow(rows, 2, rfidGetLastReader() < 0 ? "Imbas ikut LED" : "Angkat & imbas lagi");
    lcdPutRow(rows, 3, "NEXT: Menu utama");
  } else if (appMode == AppMode::PLAY && quiz.phase == QuizPhase::SUMMARY) {
    lcdPutCentered(rows, 0, "PUSINGAN SELESAI");
    const unsigned pct = quiz.length ? unsigned(quiz.score) * 100U / quiz.length : 0;
    snprintf(text, sizeof(text), "Skor: %u/%u (%u%%)", unsigned(quiz.score), unsigned(quiz.length), pct);
    lcdPutRow(rows, 1, text);
    char duration[16]; quizFormatTime(duration, sizeof(duration));
    snprintf(text, sizeof(text), "Masa akhir: %s", duration);
    lcdPutRow(rows, 2, text);
    lcdPutRow(rows, 3, "NEXT:Lagi HINT:Menu");
  } else if (appMode == AppMode::PLAY && quizCurrentQuestion()) {
    lcdQuizHeader(rows);
    lcdQuizBody(rows, *quizCurrentQuestion());
  } else lcdMenu(rows);
  // Tulis hanya baris berubah; tiada clear/delay berulang yang menyebabkan kelipan.
  for (uint8_t r = 0; r < 4; ++r) {
    if (memcmp(rows[r], lcdPrevious[r], 21) == 0) continue;
    lcd.setCursor(0, r); lcd.print(rows[r]);
    memcpy(lcdPrevious[r], rows[r], 21);
  }
}
