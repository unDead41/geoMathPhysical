#include "application/quiz.h"
#include "application/app.h"
#include "application/registry.h"
#include "application/ports.h"
#include "domain/quiz_engine.h"
#include "question_bank.h"

namespace { QuizEngine quizEngine(QUESTIONS, QUESTION_COUNT); }
const QuizData &quizState() { return quizEngine.data(); }
const Question *quizCurrentQuestion() { return quizEngine.current(); }
uint8_t quizActiveReader() { return quizEngine.activeReader(); }
uint32_t quizElapsedMs() { return quizEngine.elapsed(appPorts().now()); }
void quizPauseClock() { quizEngine.pause(appPorts().now()); }
void quizResumeClock() { quizEngine.resume(appPorts().now()); }
void quizFinishClock() { quizEngine.finish(appPorts().now()); }
void quizFormatTime(char *out, size_t capacity) { formatQuizTime(quizElapsedMs(), out, capacity); }
void quizBegin() { quizDiscard(); }
void quizDiscard() { quizEngine.reset(); }
uint8_t bankBuildRound(uint8_t mask, uint8_t *out) {
  return bankBuildRound(mask, out, appPorts().randomIndex);
}
void quizArmCurrentReader() {
  const Question *q = quizCurrentQuestion();
  if (!q || quizState().advancePending) { appPorts().setReaderMode(ScanMode::STOPPED); return; }
  appPorts().setReaderMode(quizActiveReader() == 0 ? ScanMode::R1 : ScanMode::R2);
  appPorts().requireFreshCards();
}
bool quizStartRound() {
  if (!registryActiveReady()) {
    appLogf("[ERROR] Daftar UID R1 dan R2 bagi jenis aktif, atau pilih jenis lengkap dengan use.\n");
    registryPrintActive(); return false;
  }
  uint8_t selected[ROUND_TARGET] = {};
  const uint8_t count = bankBuildRound(registryState().activeMask, selected);
  if (!quizEngine.start(selected, count, appPorts().now())) {
    appLogf("[ERROR] Bank soalan tidak mencukupi.\n"); return false;
  }
  appLogf("\n[ROUND] %u soalan; dua kad setiap soalan: R1 bongkah -> R2 bentangan.\n", unsigned(count));
  quizPrintQuestion();
  return true;
}
void quizPrintQuestion() {
  const Question *q = quizCurrentQuestion();
  if (!q) return;
  appLogf("[Q %u/%u | %s] %s\nImbas kad %s di R%u. Kedua-dua tahap betul: +1.\n",
          unsigned(quizState().index + 1), unsigned(quizState().length), q->id, q->fullText,
          quizActiveReader() == 0 ? "bongkah" : "bentangan", unsigned(quizActiveReader() + 1));
}
void quizPrintScore() {
  const QuizData &quiz = quizState();
  const unsigned pct = quiz.length ? unsigned(quiz.score) * 100U / quiz.length : 0;
  char duration[16]; quizFormatTime(duration, sizeof(duration));
  appLogf("[SCORE] %u/%u (%u%%) | salah=%u | soalan guna hint=%u | masa=%s\n",
          unsigned(quiz.score), unsigned(quiz.length), pct,
          unsigned(quiz.wrongAttempts), unsigned(quiz.hintsUsed), duration);
}
void quizNext() {
  if (appState().mode != AppMode::PLAY) return;
  if (quizState().phase == QuizPhase::SUMMARY || quizState().phase == QuizPhase::SETUP) {
    appPlay(true); return;
  }
  if (!quizEngine.skip(appPorts().now())) return;
  appLogf("[SKIP] +0 markah. Tiga kelipan merah; masa dijeda 900 ms.\n");
  appPorts().setReaderMode(ScanMode::STOPPED);
}
void quizUpdate() {
  if (appState().mode != AppMode::PLAY) return;
  switch (quizEngine.update(appPorts().now())) {
    case QuizTransition::QUESTION: quizArmCurrentReader(); quizPrintQuestion(); break;
    case QuizTransition::SUMMARY:
      appPorts().setReaderMode(ScanMode::STOPPED);
      appLogf("[ROUND TAMAT] NEXT=main semula, HINT=menu utama.\n");
      quizPrintScore(); break;
    case QuizTransition::NONE: break;
  }
}
void quizHint() {
  if (appState().mode != AppMode::PLAY || !quizEngine.toggleHint()) return;
  if (quizState().showHint) {
    const Question &q = *quizCurrentQuestion();
    appLogf("[HINT] %s %s %s\n", q.hint[0], q.hint[1], q.hint[2]);
  } else appLogf("[HINT] Kembali ke soalan yang sama.\n");
}
void quizRetry() {
  if (!quizEngine.retry()) return;
  quizArmCurrentReader();
  appLogf("[RETRY] Mulakan semula pasangan di R1. Angkat kad; markah dikekalkan.\n");
}
void quizOnScan(uint8_t reader, const Uid &uid) {
  if (appState().mode != AppMode::PLAY) return;
  uint8_t registeredReader;
  const Shape found = registryLookup(uid, registeredReader);
  const uint8_t previousReader = quizActiveReader();
  if (!quizEngine.submit(reader, found, registeredReader, appPorts().now())) return;
  if (previousReader != quizActiveReader()) {
    quizArmCurrentReader();
    appLogf("[R1 TEPAT] Belum mendapat markah. Angkat kad bentangan dan imbas di R2.\n");
  }
  switch (quizState().feedback) {
    case Feedback::WRONG_PAD:
      appLogf("[READER] Imbas kad yang betul mengikut LED pembaca semasa.\n"); break;
    case Feedback::UNKNOWN_UID:
      appLogf("[UID] Kad belum didaftarkan. Guru boleh guna assign.\n"); break;
    case Feedback::RIGHT:
      appLogf("[TEPAT] Dua kad betul: +1 sekali sahaja. Tiga kelipan hijau; masa dijeda.\n");
      appPorts().setReaderMode(ScanMode::STOPPED); quizPrintScore(); break;
    case Feedback::WRONG:
      appLogf("[SALAH] Cuba jawapan lain untuk soalan yang sama.\n"); break;
    default: break;
  }
}
RgbColor quizReaderColor(uint8_t reader) {
  return appState().mode == AppMode::PLAY ? quizEngine.readerColor(reader) : RgbColor::OFF;
}

