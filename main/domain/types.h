#pragma once
#include <cstddef>
#include <cstdint>
#include "rules.h"

// ID ini juga digunakan dalam simpanan NVS; jangan ubah nilainya sesuka hati.
enum class Shape : uint8_t {
  CUBE = 0, PYRAMID = 1, CYLINDER = 2, CONE = 3, CUBOID = 4, NONE = 255
};
enum class AppMode : uint8_t { STOPPED, PLAY, UID_SCAN, ENROLL };
enum class QuizPhase : uint8_t { SETUP, QUESTION, SUMMARY };
enum class Feedback : uint8_t { WAITING, WRONG, RIGHT, UNKNOWN_UID, WRONG_PAD, SKIPPED };
enum class ScanMode : uint8_t { STOPPED, BOTH, R1, R2 };
enum class RgbColor : uint8_t { OFF, BLUE, GREEN, RED };
struct Uid { uint8_t size; uint8_t bytes[10]; };
using RandomIndex = uint8_t (*)(uint8_t upperExclusive);
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


// Storage ABI of the existing ESP32 image; fail the build rather than silently migrate.
static_assert(sizeof(Uid) == 11, "NVS UID layout changed");
static_assert(offsetof(RegistryData, tags) == 8 && sizeof(RegistryData) == 120, "NVS registry layout changed");
