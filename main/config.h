#pragma once
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>
#include <ctype.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#if !defined(ARDUINO_ARCH_ESP32) || !defined(CONFIG_IDF_TARGET_ESP32)
#error "Pilih ESP32 Dev Module klasik/WROOM-32, bukan UNO, C3 atau S3."
#endif

// Semua nombor pin ialah GPIO, bukan kedudukan fizikal pada header.
constexpr uint32_t SERIAL_BAUD = 115200;
constexpr uint8_t READER_COUNT = 2;
// Ikut gambar wiring pengguna: R1 SS=5, R2 SS=27, RST bersama=4.
constexpr uint8_t RFID_SS_PINS[2] = {5, 27};
constexpr uint8_t RFID_RST_PIN = 4;
constexpr uint8_t RFID_SCK_PIN = 18, RFID_MISO_PIN = 19, RFID_MOSI_PIN = 23;
constexpr uint16_t RFID_POLL_MS = 35, RFID_FIELD_SETTLE_MS = 6;
constexpr uint8_t RFID_EMPTY_POLLS = 3;
constexpr uint8_t LCD_SDA_PIN = 21, LCD_SCL_PIN = 22;
constexpr uint8_t LCD_COLUMNS = 20, LCD_ROWS = 4;
constexpr uint32_t LCD_I2C_CLOCK_HZ = 100000;
constexpr uint8_t BUTTON_PINS[2] = {32, 33};
// GPIO32/33 menyokong bias dalaman; buttonsBegin() ikut polariti modul.
constexpr uint8_t BUTTON_PRESSED_LEVEL[2] = {LOW, LOW};
constexpr uint16_t BUTTON_DEBOUNCE_MS = 40;
// LED biasa: GPIO25=R1, GPIO26=R2. Mod RGB pilihan menggunakan pin R/G/B ini.
constexpr uint8_t RGB_PINS[2][3] = {{25, 13, 14}, {26, 16, 17}};
#ifndef GEODECODER_RGB_ENABLED
// 0 = dua LED biasa GPIO25/26; 1 = dua RGB mengikut jadual pin di atas.
#define GEODECODER_RGB_ENABLED 0
#endif
constexpr bool RGB_ENABLED = GEODECODER_RGB_ENABLED != 0;
constexpr bool RGB_COMMON_ANODE = false; // Common pin ke GND; jika true ke 3V3.
constexpr uint8_t ROUND_TARGET = 5, QUESTIONS_PER_SHAPE = 3;
constexpr uint8_t INSTRUCTION_PAGE_COUNT = 6;
constexpr uint16_t QUIZ_NOTICE_MS = 1000, QUIZ_ERROR_MS = 1200;
constexpr uint16_t COMMAND_BUFFER_SIZE = 160;
constexpr uint32_t ENROLL_TIMEOUT_MS = 30000;
static_assert(ROUND_TARGET <= 10 && ROUND_TARGET > 0, "Saiz round mesti 1..10.");

// ID ini juga digunakan dalam simpanan NVS; jangan ubah nilainya sesuka hati.
enum class Shape : uint8_t {
  CUBE = 0, PYRAMID = 1, CYLINDER = 2, CONE = 3, CUBOID = 4, NONE = 255
};
constexpr uint8_t SHAPE_COUNT = 5;
constexpr uint8_t ALL_SHAPES_MASK = (1U << SHAPE_COUNT) - 1;
// Boot baharu: semua 5 jenis. Pilihan aktif lama dalam NVS dikekalkan.
constexpr uint8_t DEFAULT_ACTIVE_MASK = ALL_SHAPES_MASK;
enum class AppMode : uint8_t { STOPPED, PLAY, UID_SCAN, ENROLL };
enum class QuizPhase : uint8_t { SETUP, QUESTION, SUMMARY };
enum class Feedback : uint8_t { WAITING, WRONG, RIGHT, UNKNOWN_UID, WRONG_PAD, SKIPPED };
enum class ScanMode : uint8_t { STOPPED, BOTH, R1, R2 };
enum class RgbColor : uint8_t { OFF, BLUE, GREEN, RED, YELLOW };
struct Uid { uint8_t size; uint8_t bytes[10]; };
struct Question {
  const char *id;
  Shape answer;
  uint8_t reader; // 0=bongkah/R1, 1=bentangan/R2. Satu imbasan sahaja.
  const char *lines[3]; // <=20 aksara ASCII setiap baris.
  const char *hint[3];
  const char *fullText;
};
struct RegistryData {
  uint32_t magic;
  uint16_t version;
  uint8_t activeMask;
  uint8_t reserved;
  Uid tags[SHAPE_COUNT][READER_COUNT];
};
struct QuizData {
  QuizPhase phase;
  uint8_t order[ROUND_TARGET];
  uint8_t length, index, score;
  uint16_t wrongAttempts, hintsUsed;
  bool awarded, showHint, hintUsedHere, advancePending;
  Feedback feedback;
  uint32_t feedbackStartedMs;
  uint32_t elapsedMs, clockStartedMs;
  bool clockRunning, clockFinished;
};
struct ReaderRecord {
  Uid uid;
  uint8_t version, misses;
  bool online, present, requireRemoval;
  uint32_t count;
};

#include "question_bank.h"

extern RegistryData registryData;
extern bool registryStorageReady;
extern QuizData quiz;
extern AppMode appMode;
extern int8_t enrollReader;
extern Shape enrollShape;
extern uint32_t enrollStarted;
extern bool appShowInstructions;
extern uint8_t appInstructionPage;

const char *shapeName(Shape shape);
const char *shapeLabel(Shape shape);
Shape shapeFromName(const char *name);
uint8_t shapeBit(Shape shape);
uint8_t maskCount(uint8_t mask);
bool uidValid(const Uid &uid);
bool uidEqual(const Uid &a, const Uid &b);
bool uidParse(const char *text, Uid &out);
void uidFormat(const Uid &uid, char *out, size_t capacity, bool spaced);
void registryBegin();
bool registryReady(Shape shape);
bool registryActiveReady();
bool registryAssign(uint8_t reader, Shape shape, const Uid &uid);
bool registryUnassign(uint8_t reader, Shape shape);
bool registrySetActive(uint8_t mask);
bool registrySetCount(uint8_t count);
Shape registryLookup(const Uid &uid, uint8_t &registeredReader);
void registryPrint();
void registryPrintActive();

void quizBegin();
void quizDiscard();
bool quizStartRound();
void quizNext();
void quizUpdate();
void quizArmCurrentReader();
void quizHint();
void quizRetry();
void quizOnScan(uint8_t reader, const Uid &uid);
const Question *quizCurrentQuestion();
void quizPrintQuestion();
void quizPrintScore();
uint32_t quizElapsedMs();
void quizPauseClock();
void quizResumeClock();
void quizFinishClock();
void quizFormatTime(char *out, size_t capacity);
RgbColor quizColor();
RgbColor quizReaderColor(uint8_t reader);

void appBegin();
void appUpdate();
void appNextButton();
void appHintButton();
bool appPlay(bool newRound);
void appStop();
void appInspect(ScanMode mode);
bool appEnroll(uint8_t reader, Shape shape);
void appConfigurationChanged();
void appHandleScan(uint8_t reader, const Uid &uid);

void serialBegin();
void serialUpdate();
void serialExecute(char *line);
void serialPrintHelp();
void serialPrintPins();
void serialPrintStatus();
void serialPrintUid(uint8_t reader);
void serialPrintBank();

void rfidBegin();
void rfidUpdate();
void rfidSetMode(ScanMode mode);
void rfidRequireFreshCards();
bool rfidPadsArmed();
bool rfidReaderEnabled(uint8_t reader);
const ReaderRecord &rfidGetRecord(uint8_t reader);
int8_t rfidGetLastReader();
ScanMode rfidGetMode();
void buttonsBegin();
void buttonsUpdate();
bool buttonIsPressed(uint8_t reader);
void lcdBegin();
void lcdUpdate();
bool lcdIsReady();
void rgbBegin();
void rgbUpdate();
