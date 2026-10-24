#include "presentation/serial_commands.h"
#include "application/app.h"
#include "application/quiz.h"
#include "application/registry.h"
#include "hardware/rfid.h"
#include "hardware/buttons.h"
#include "hardware/lcd.h"
#include "question_bank.h"
#include "config.h"
#include <cctype>
#include <cstdlib>
#include <cstring>

void serialLog(const char *text) { Serial.printf("%s", text); }

namespace {
char serialLine[COMMAND_BUFFER_SIZE] = {};
uint16_t serialLength = 0;
bool serialOverflow = false;

}

void serialBegin() {
  serialLength = 0; serialOverflow = false;
  Serial.begin(SERIAL_BAUD);
  Serial.println(F("\nGeoDecoder | ESP32 | R1 BONGKAH + R2 BENTANGAN"));
  Serial.println(F("115200 baud, Newline / Both NL & CR. Taip help."));
}

void serialUpdate() {
  uint8_t budget = 64;
  while (Serial.available() > 0 && budget--) {
    const char c = char(Serial.read());
    if (c == '\n' || c == '\r') {
      if (serialOverflow) Serial.println(F("[ERROR] Arahan terlalu panjang; seluruh baris diabaikan."));
      else if (serialLength) { serialLine[serialLength] = '\0'; serialExecute(serialLine); }
      serialLength = 0; serialOverflow = false;
    } else if (!serialOverflow) {
      if (c == '\b' || c == 127) { if (serialLength) --serialLength; }
      else if ((uint8_t(c) >= 32 || c == '\t') && serialLength < COMMAND_BUFFER_SIZE - 1)
        serialLine[serialLength++] = c;
      else if (serialLength >= COMMAND_BUFFER_SIZE - 1) serialOverflow = true;
    }
  }
}

void serialCommandError() {
  Serial.println(F("[ERROR] Arahan/argumen tidak sah. Taip help. Tiada tetapan diubah."));
}

void serialExecute(char *line) {
  for (char *p = line; *p; ++p) *p = char(tolower(static_cast<unsigned char>(*p)));
  char *args[16] = {}, *save = nullptr;
  uint8_t argc = 0;
  char *token = strtok_r(line, " \t\v\f", &save);
  while (token) {
    if (argc >= 16) { serialCommandError(); return; }
    args[argc++] = token; token = strtok_r(nullptr, " \t\v\f", &save);
  }
  if (!argc) return;
  if (argc == 1) {
    if (!strcmp(args[0], "help")) { serialPrintHelp(); return; }
    if (!strcmp(args[0], "pins")) { serialPrintPins(); return; }
    if (!strcmp(args[0], "status")) { serialPrintStatus(); return; }
    if (!strcmp(args[0], "tags")) { registryPrint(); return; }
    if (!strcmp(args[0], "bank")) { serialPrintBank(); return; }
    if (!strcmp(args[0], "current")) { registryPrintActive(); return; }
    if (!strcmp(args[0], "score")) { quizPrintScore(); return; }
    if (!strcmp(args[0], "play")) { appPlay(false); return; }
    if (!strcmp(args[0], "stop")) { appStop(); Serial.println(F("[STOP] Kuiz dijeda, antena OFF.")); return; }
    if (!strcmp(args[0], "next")) { appNextButton(); return; }
    if (!strcmp(args[0], "hint")) { appHintButton(); return; }
    if (!strcmp(args[0], "retry") || !strcmp(args[0], "clear")) {
      if (appState().mode == AppMode::PLAY) quizRetry();
      else Serial.println(F("[INFO] Taip play dahulu."));
      return;
    }
  }
  if (argc == 2 && !strcmp(args[0], "current") &&
      (!strcmp(args[1], "bongkah") || !strcmp(args[1], "kubus"))) {
    registryPrintActive(); return;
  }
  if (argc == 2 && !strcmp(args[0], "round") && !strcmp(args[1], "new")) {
    appPlay(true); return;
  }
  if ((argc == 2 || argc == 3) && !strcmp(args[0], "check") && !strcmp(args[1], "uid")) {
    ScanMode mode = ScanMode::BOTH;
    if (argc == 3) {
      if (!strcmp(args[2], "1")) mode = ScanMode::R1;
      else if (!strcmp(args[2], "2")) mode = ScanMode::R2;
      else if (strcmp(args[2], "all")) { serialCommandError(); return; }
    }
    appInspect(mode); return;
  }
  if (argc == 3 && !strcmp(args[0], "set") &&
      (!strcmp(args[1], "bongkah") || !strcmp(args[1], "kubus"))) {
    char *end = nullptr;
    const long n = strtol(args[2], &end, 10);
    if (!args[2][0] || *end || n < 1 || n > SHAPE_COUNT) { serialCommandError(); return; }
    if (registrySetCount(uint8_t(n))) { appConfigurationChanged(); registryPrintActive(); }
    return;
  }
  if (argc >= 2 && argc <= SHAPE_COUNT + 1 && !strcmp(args[0], "use")) {
    uint8_t mask = 0;
    for (uint8_t i = 1; i < argc; ++i) {
      const uint8_t bit = shapeBit(shapeFromName(args[i]));
      if (!bit || (mask & bit)) { serialCommandError(); return; }
      mask |= bit;
    }
    if (registrySetActive(mask)) { appConfigurationChanged(); registryPrintActive(); }
    return;
  }
  if (argc >= 3 && !strcmp(args[0], "assign")) {
    if (strcmp(args[1], "r1") && strcmp(args[1], "r2")) { serialCommandError(); return; }
    const uint8_t reader = args[1][1] == '1' ? 0 : 1;
    const Shape shape = shapeFromName(args[2]);
    if (shape == Shape::NONE) { serialCommandError(); return; }
    if (argc == 3) { appEnroll(reader, shape); return; }
    char text[48] = {};
    size_t used = 0;
    for (uint8_t i = 3; i < argc; ++i) {
      const size_t n = strlen(args[i]);
      if (used + n + 2 > sizeof(text)) { serialCommandError(); return; }
      if (used) text[used++] = ' ';
      memcpy(text + used, args[i], n); used += n; text[used] = '\0';
    }
    Uid uid = {};
    if (!uidParse(text, uid)) { Serial.println(F("[ERROR] UID mesti 4, 7 atau 10 byte hex.")); return; }
    if (registryAssign(reader, shape, uid)) appConfigurationChanged();
    return;
  }
  if (argc == 3 && !strcmp(args[0], "unassign")) {
    if (strcmp(args[1], "r1") && strcmp(args[1], "r2")) { serialCommandError(); return; }
    const Shape shape = shapeFromName(args[2]);
    if (shape == Shape::NONE) { serialCommandError(); return; }
    if (registryUnassign(args[1][1] == '1' ? 0 : 1, shape)) appConfigurationChanged();
    return;
  }
  serialCommandError();
}

void serialPrintHelp() {
  Serial.println(F(
    "\n--- COMMANDS / SEMUA ARAHAN ---\n"
    "help                       : senarai ini\n"
    "current                    : jenis aktif + kiraan\n"
    "current bongkah            : sama seperti current\n"
    "current kubus              : alias current bongkah\n"
    "set bongkah 3              : 1..5 jenis pertama yang UID lengkap\n"
    "set kubus 3                : alias set bongkah 3\n"
    "use kubus piramid silinder : pilih jenis aktif secara khusus\n"
    "check uid                  : baca UID kedua-dua reader, kuiz dijeda\n"
    "check uid all              : sama seperti check uid\n"
    "check uid 1 / check uid 2  : baca satu reader sahaja\n"
    "assign r1 kubus            : imbas kad bongkah kubus di R1\n"
    "assign r2 kubus            : imbas kad bentangan kubus di R2\n"
    "assign r1 kubus 04 A1 B2 C3 : daftar/tukar UID secara terus\n"
    "unassign r1 kubus          : buang satu pendaftaran\n"
    "tags                       : semua UID + peranan\n"
    "play                       : mula/sambung kuiz\n"
    "stop                       : kembali menu/jeda kuiz/batal pendaftaran\n"
    "round new                  : reset markah + round rawak baharu\n"
    "next                       : sama seperti B1\n"
    "hint                       : sama seperti B2\n"
    "retry / clear              : ulang pasangan dari R1, kekal markah\n"
    "score                      : markah, salah, penggunaan hint\n"
    "status                     : status perkakasan + kuiz\n"
    "pins                       : semua GPIO\n"
    "bank                       : semua 15 soalan + hint (untuk guru)\n"
    "Jenis: kubus, piramid, silinder, kon, kuboid.\n"
    "English aliases: cube, pyramid, cylinder, cone, cuboid.\n"
    "Piramid = tapak SEGI EMPAT SAMA. R1=bongkah, R2=bentangan.\n"
    "assign/use/set/unassign menyimpan NVS dan membatalkan round lama.\n"
    "UID 4/7/10 byte: 04A1B2C3 atau 04:A1:B2:C3 atau byte berjarak.\n"
    "Pendaftaran imbas tamat selepas satu kad berjaya atau timeout 30s.\n"
    "Menu: B1/NEXT=mula baharu; B2/HINT=cara bermain 6 halaman.\n"
    "Panduan: HINT maju hingga tamat lalu kembali menu.\n"
    "Kuiz: B1=langkau (+0); B2=buka/tutup hint. R1 bongkah -> R2 bentangan.\n"
    "Dua kad sepadan=+1 sekali. Tiga kelipan 150ms ON/OFF; masa dijeda.\n"
    "Biru=imbas, kuning=hint, merah=salah, hijau=tahap betul. Angkat kad.\n"
    "Markah akhir: B1=main semula; B2=menu. Imbas/daftar: B1=menu/batal.\n"));
}

void serialPrintPins() {
  Serial.printf("SPI SCK=%u MISO=%u MOSI=%u | SS1=%u SS2=%u RST=%u\n",
                unsigned(RFID_SCK_PIN), unsigned(RFID_MISO_PIN), unsigned(RFID_MOSI_PIN),
                unsigned(RFID_SS_PINS[0]), unsigned(RFID_SS_PINS[1]), unsigned(RFID_RST_PIN));
  Serial.printf("LCD SDA=%u SCL=%u | B1=%u B2=%u (bias dalaman ikut polariti)\n",
                unsigned(LCD_SDA_PIN), unsigned(LCD_SCL_PIN), unsigned(BUTTON_PINS[0]), unsigned(BUTTON_PINS[1]));
  for (uint8_t i = 0; i < 2; ++i)
    Serial.printf("RGB%u R/G/B=%u/%u/%u | %s\n", unsigned(i + 1), unsigned(RGB_PINS[i][0]),
                  unsigned(RGB_PINS[i][1]), unsigned(RGB_PINS[i][2]), RGB_ENABLED ? "MOD RGB" : "LED BIASA: PIN R SAHAJA");
  Serial.println(F("RC522/modul butang=3.3V. LCD 5V melalui penukar aras I2C dua hala."));
}

void serialPrintUid(uint8_t reader) {
  const ReaderRecord &record = rfidGetRecord(reader);
  char text[30]; uidFormat(record.uid, text, sizeof(text), true);
  Serial.printf("[R%u] UID: %s | bytes=%u | count=%lu\n", unsigned(reader + 1), text,
                unsigned(record.uid.size), static_cast<unsigned long>(record.count));
}

void serialPrintStatus() {
  const char *mode = appState().mode == AppMode::PLAY ? "PLAY" : appState().mode == AppMode::UID_SCAN ? "UID_SCAN" :
                     appState().mode == AppMode::ENROLL ? "ENROLL" : "STOP";
  Serial.printf("[STATUS] mode=%s | NVS=%s | LCD=%s | LED=%s\n", mode,
                registryIsStorageReady() ? "READY" : "ERROR", lcdIsReady() ? "READY" : "ERROR",
                RGB_ENABLED ? "RGB" : "BIASA GPIO25/26");
  for (uint8_t i = 0; i < 2; ++i) {
    const ReaderRecord &r = rfidGetRecord(i);
    Serial.printf("R%u: %s | perlu angkat=%s | B%u=%s\n", unsigned(i + 1),
                  r.online ? "READY" : "NOT FOUND", r.requireRemoval ? "YA" : "TIDAK",
                  unsigned(i + 1), buttonIsPressed(i) ? "PRESSED" : "RELEASED");
    serialPrintUid(i);
  }
  registryPrintActive(); quizPrintScore();
}

void serialPrintBank() {
  Serial.println(F("[BANK] Soalan cadangan Bab 6; paparan ASCII disingkatkan untuk LCD."));
  for (const Question &q : QUESTIONS) {
    Serial.printf("%s [%s, R1 -> R2] %s\n", q.id, shapeName(q.answer), q.fullText);
    Serial.printf("  HINT: %s | %s | %s\n", q.hint[0], q.hint[1], q.hint[2]);
  }
}

