#include "application/app.h"
#include "application/ports.h"
#include "application/quiz.h"
#include "application/registry.h"
#include "domain/rgb_random.h"

namespace {
AppState state = {AppMode::STOPPED, -1, Shape::NONE, 0, false, 0};
enum class AmbientMode : uint8_t { OFF, MENU, SUMMARY };
AmbientMode ambientMode = AmbientMode::OFF;
RgbColor ambientColors[READER_COUNT] = {};
uint32_t ambientStartedMs = 0;

void pickAmbientColors() {
  // Each reader changes colour; R2 also excludes the newly selected R1 colour.
  for (uint8_t r = 0; r < READER_COUNT; ++r) {
    ambientColors[r] = pickRandomRgbColor(ambientColors[r],
      r ? ambientColors[0] : RgbColor::OFF, appPorts().randomIndex);
  }
}
void updateAmbientColors() {
  const AmbientMode wanted = state.mode == AppMode::STOPPED ? AmbientMode::MENU :
    state.mode == AppMode::PLAY && quizState().phase == QuizPhase::SUMMARY
      ? AmbientMode::SUMMARY : AmbientMode::OFF;
  const uint32_t now = appPorts().now();
  if (wanted != ambientMode) {
    ambientMode = wanted; ambientStartedMs = now;
    if (wanted != AmbientMode::OFF) pickAmbientColors();
    return;
  }
  if (wanted == AmbientMode::OFF) return;
  const uint16_t interval = wanted == AmbientMode::MENU ? MENU_COLOR_MS : SUMMARY_COLOR_MS;
  if (uint32_t(now - ambientStartedMs) >= interval) {
    ambientStartedMs = now; pickAmbientColors();
  }
}
}
const AppState &appState() { return state; }

void appBegin() {
  appStop();
  appLogf("[MENU] GeoDecoder: B1/NEXT untuk mula, B2/HINT untuk cara bermain.\n");
  if (!registryActiveReady())
    appLogf("[SETUP] Daftar kad R1 dan R2 bagi jenis aktif, kemudian tekan NEXT.\n");
}

void appStop() {
  quizPauseClock();
  state.mode = AppMode::STOPPED; state.enrollReader = -1; state.enrollShape = Shape::NONE;
  state.showInstructions = false;
  state.instructionPage = 0;
  appPorts().setReaderMode(ScanMode::STOPPED);
  updateAmbientColors();
}

void appNextButton() {
  if (state.mode == AppMode::PLAY) { quizNext(); return; }
  if (state.mode != AppMode::STOPPED) {
    appStop(); // Keluar daripada imbasan guru / batalkan pendaftaran belum selesai.
    appLogf("[MENU] Tekan NEXT untuk mula atau sambung permainan.\n");
    return;
  }
  if (state.showInstructions) return; // HINT perlu menamatkan semua halaman panduan.
  appPlay(true); // NEXT pada menu memulakan pusingan baharu.
}

void appHintButton() {
  if (state.mode == AppMode::STOPPED) {
    if (!state.showInstructions) { state.showInstructions = true; state.instructionPage = 0; }
    else if (state.instructionPage + 1 < INSTRUCTION_PAGE_COUNT) ++state.instructionPage;
    else { state.showInstructions = false; state.instructionPage = 0; }
  }
  else if (state.mode == AppMode::PLAY) {
    if (quizState().phase == QuizPhase::SUMMARY) appStop();
    else quizHint();
  }
}

bool appPlay(bool newRound) {
  if (!appPorts().readerOnline(0) || !appPorts().readerOnline(1)) {
    appLogf("[ERROR] Kedua-dua RC522 mesti READY. Semak status, bekalan dan SPI.\n"); return false;
  }
  if (!registryActiveReady()) {
    appLogf("[ERROR] UID R1 dan R2 bagi jenis aktif belum lengkap.\n");
    registryPrintActive(); return false;
  }
  if (newRound || (quizState().phase != QuizPhase::QUESTION &&
                   quizState().phase != QuizPhase::WRONG_ANSWER)) {
    if (!quizStartRound()) return false;
  } else if (quizState().phase == QuizPhase::QUESTION &&
             !quizState().advancePending && !quizState().awarded) {
    quizRetry(); // Imbasan penyelenggaraan tidak boleh dibawa masuk sebagai jawapan.
  }
  state.mode = AppMode::PLAY; state.enrollReader = -1; state.enrollShape = Shape::NONE;
  state.showInstructions = false;
  state.instructionPage = 0;
  updateAmbientColors();
  quizResumeClock();
  quizArmCurrentReader();
  if (quizState().phase == QuizPhase::WRONG_ANSWER)
    appLogf("[PLAY] Jawapan salah dimuktamadkan. Masa dijeda; NEXT=teruskan.\n");
  else appLogf("[PLAY] Ikut fokus soalan dan LED biru. R1=bongkah; R2=bentangan. NEXT=langkau; HINT=petunjuk.\n");
  return true;
}

void appInspect(ScanMode mode) {
  quizPauseClock();
  state.mode = AppMode::UID_SCAN; state.enrollReader = -1; state.enrollShape = Shape::NONE;
  appPorts().setReaderMode(mode);
  appLogf("[UID SCAN] Tiada pemarkahan. NEXT kembali ke menu; play sambung kuiz.\n");
}

bool appEnroll(uint8_t reader, Shape shape) {
  if (reader >= 2 || uint8_t(shape) >= SHAPE_COUNT || !appPorts().readerOnline(reader)) {
    appLogf("[ERROR] Jenis/reader tidak sah atau reader tidak READY.\n"); return false;
  }
  quizPauseClock();
  state.mode = AppMode::ENROLL; state.enrollReader = int8_t(reader); state.enrollShape = shape;
  state.enrollStarted = appPorts().now();
  appPorts().setReaderMode(reader == 0 ? ScanMode::R1 : ScanMode::R2);
  appLogf("[ASSIGN] Imbas kad %s %s di R%u. Baki 30s; stop untuk batal.\n",
                reader == 0 ? "bongkah" : "bentangan", shapeName(shape), unsigned(reader + 1));
  return true;
}

void appConfigurationChanged() {
  appStop(); quizDiscard();
  appLogf("[CONFIG] Disimpan. Round lama dikosongkan; tekan NEXT atau taip play untuk mula.\n");
}

void appHandleScan(uint8_t reader, const Uid &uid) {
  if (reader >= 2) return;
  if (state.mode == AppMode::PLAY) quizOnScan(reader, uid);
  else if (state.mode == AppMode::ENROLL && reader == uint8_t(state.enrollReader)) {
    if (registryAssign(reader, state.enrollShape, uid)) appConfigurationChanged();
    // Kad pendua/gagal NVS tidak disimpan. Tunggu kad lain sehingga timeout.
  }
}

void appUpdate() {
  quizUpdate();
  updateAmbientColors();
  if (state.mode == AppMode::ENROLL && uint32_t(appPorts().now() - state.enrollStarted) >= ENROLL_TIMEOUT_MS) {
    appStop();
    appLogf("[TIMEOUT] Pendaftaran dibatalkan; tiada UID baharu disimpan.\n");
  }
}

bool appInputBlocked(uint8_t button) {
  return state.mode == AppMode::PLAY && (quizState().advancePending ||
    (quizState().phase == QuizPhase::WRONG_ANSWER && button == 1));
}
RgbColor appReaderColor(uint8_t reader) {
  if (reader >= READER_COUNT) return RgbColor::OFF;
  if (state.mode == AppMode::ENROLL)
    return reader == uint8_t(state.enrollReader) ? RgbColor::BLUE : RgbColor::OFF;
  if (state.mode == AppMode::UID_SCAN)
    return appPorts().readerEnabled(reader) ? RgbColor::BLUE : RgbColor::OFF;
  if (state.mode == AppMode::STOPPED ||
      (state.mode == AppMode::PLAY && quizState().phase == QuizPhase::SUMMARY))
    return ambientColors[reader];
  return quizReaderColor(reader);
}

