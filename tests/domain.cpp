// Real core and view; deliberately no Arduino headers or device fakes.
#include "domain/quiz_engine.h"
#include "domain/registry.h"
#include "question_bank.h"
#include "presentation/lcd_view.h"
#include "application/ports.h"
#include "application/registry.h"
#include "application/quiz.h"
#include <iostream>
#include <set>
#include <stdexcept>
#include <cstring>

static void need(bool value, const char *message) {
  if (!value) throw std::runtime_error(message);
}
static uint8_t indexOf(const char *id) {
  for (uint8_t i = 0; i < QUESTION_COUNT; ++i)
    if (!std::strcmp(QUESTIONS[i].id, id)) return i;
  throw std::runtime_error("missing question");
}
static uint32_t seed = 7;
static uint8_t pick(uint8_t n) {
  seed = seed * 1664525U + 1013904223U;
  return uint8_t(seed % n);
}
// Catches single-card awards, early R2 acceptance, and duplicate completion.
static void scoring() {
  QuizEngine game(QUESTIONS, QUESTION_COUNT);
  const uint8_t round[] = {indexOf("P1"), indexOf("C3")};
  need(game.start(round, 2, 100), "start failed");
  game.submit(1, Shape::PYRAMID, 1, 500);
  need(game.data().score == 0 && !game.data().advancePending, "early net completed question");
  need(game.submit(0, Shape::PYRAMID, 0, 700), "solid scan ignored");
  need(game.data().score == 0 && !game.data().advancePending, "R1 alone must not score");
  need(game.readerColor(0) == RgbColor::GREEN && game.readerColor(1) == RgbColor::BLUE,
       "R1 success did not hold green and activate R2");
  game.submit(0, Shape::PYRAMID, 0, 701);
  need(game.data().score == 0, "repeated solid scored");
  game.submit(1, Shape::PYRAMID, 1, 1000);
  need(game.data().score == 1 && game.data().advancePending, "pair must score once");
  need(!game.submit(1, Shape::PYRAMID, 1, 1001) && game.data().score == 1, "double award");
  need(game.elapsed(1800) == 900, "completion blink counted as play time");
  need(game.update(1899) == QuizTransition::NONE, "blink ended before 900 ms");
  need(game.update(1900) == QuizTransition::QUESTION, "next question not opened at 900 ms");
  need(game.elapsed(2000) == 1000, "clock failed to resume after blink");
  game.submit(0, Shape::CONE, 0, 2100);
  game.submit(1, Shape::NONE, 255, 2200);
  need(game.data().feedback == Feedback::UNKNOWN_UID, "unknown UID accepted");
  game.submit(1, Shape::CUBE, 1, 2300);
  need(game.data().feedback == Feedback::WRONG && game.data().wrongAttempts == 1, "wrong shape not counted");
  need(game.readerColor(0) == RgbColor::GREEN && game.readerColor(1) == RgbColor::RED,
       "net error changed completed solid stage");
  game.submit(1, Shape::CONE, 1, 2400);
  need(game.data().score == 2 && game.elapsed(9000) == 1400, "final scan did not freeze clock");
  need(game.update(3299) == QuizTransition::NONE, "final blink ended early");
  need(game.update(3300) == QuizTransition::SUMMARY, "summary missing after 900 ms");
}
// Catches missing/extra ON/OFF phases and clock resume during transitions.
static void blinkAndSkip() {
  for (unsigned completedSolid = 0; completedSolid < 2; ++completedSolid) {
    for (unsigned correct = 0; correct < 2; ++correct) {
      QuizEngine game(QUESTIONS, QUESTION_COUNT);
      const uint8_t round[] = {indexOf("K1"), indexOf("P1")};
      game.start(round, 2, 0);
      if (completedSolid || correct) game.submit(0, Shape::CUBE, 0, 500);
      if (correct) game.submit(1, Shape::CUBE, 1, 1000);
      else need(game.skip(1000), "skip rejected on active stage");
      const RgbColor on = correct ? RgbColor::GREEN : RgbColor::RED;
      need(game.data().score == correct, "partial/skip award incorrect");
      for (uint32_t offset = 0; offset < 900; ++offset) {
        need(game.update(1000 + offset) == QuizTransition::NONE, "transition ended early");
        const RgbColor expected = (offset / 150) % 2 == 0 ? on : RgbColor::OFF;
        need(game.readerColor(0) == expected && game.readerColor(1) == expected,
             "blink must be exactly three synchronous 150 ms ON/OFF cycles");
        game.resume(1000 + offset);
        need(game.elapsed(1000 + offset) == 1000, "stopwatch ran during blink");
        need(!game.submit(0, Shape::CUBE, 0, 1000 + offset) &&
             !game.toggleHint() && !game.skip(1000 + offset) && !game.retry(), "transition accepted input");
      }
      need(game.update(1900) == QuizTransition::QUESTION, "transition duration is not 900 ms");
      need(game.readerColor(0) == RgbColor::BLUE && game.readerColor(1) == RgbColor::OFF,
           "next question kept stage progress");
      need(game.elapsed(2000) == 1100, "resume counted blink time");
    }
  }
}
// Catches changing reader roles, stale hint state and loss of R1 progress.
static void stageRetry() {
  QuizEngine game(QUESTIONS, QUESTION_COUNT);
  const uint8_t round[] = {indexOf("P1")};
  game.start(round, 1, 0);
  game.submit(0, Shape::PYRAMID, 1, 100); // net UID on solid pad
  need(game.data().feedback == Feedback::WRONG_PAD && !game.data().awarded, "wrong role accepted");
  game.submit(0, Shape::CUBE, 0, 200);
  need(game.readerColor(0) == RgbColor::RED && game.readerColor(1) == RgbColor::OFF, "wrong solid colours");
  game.update(1400);
  need(game.readerColor(0) == RgbColor::BLUE, "error did not return to blue");
  game.toggleHint();
  const RgbColor hintColour = game.readerColor(0);
  need(hintColour != RgbColor::BLUE && hintColour != RgbColor::RED && hintColour != RgbColor::OFF,
       "hint must use a distinct yellow colour");
  game.submit(0, Shape::CUBE, 0, 1500); game.update(2700);
  need(game.readerColor(0) == hintColour && game.data().showHint, "error lost open hint colour");
  game.submit(0, Shape::PYRAMID, 0, 3000);
  need(!game.data().showHint && game.data().score == 0, "solid success must close hint without scoring");
  game.toggleHint();
  need(game.readerColor(0) == RgbColor::GREEN && game.readerColor(1) == hintColour, "net hint changed R1 green");
  game.submit(1, Shape::CUBE, 1, 3100); game.update(4300);
  need(game.readerColor(0) == RgbColor::GREEN && game.readerColor(1) == hintColour, "net retry lost hint/R1");
  game.toggleHint();
  need(game.readerColor(1) == RgbColor::BLUE && game.data().hintsUsed == 1, "hint toggling changed count");
  game.submit(1, Shape::PYRAMID, 0, 4400);
  need(game.data().feedback == Feedback::WRONG_PAD && game.data().score == 0, "solid UID on R2 accepted");
  game.submit(1, Shape::PYRAMID, 1, 4500);
  need(game.data().score == 1, "pair cannot complete while recovering from error");
}
static void hintAndPause() {
  QuizEngine game(QUESTIONS, QUESTION_COUNT);
  const uint8_t round[] = {indexOf("K1")};
  game.start(round, 1, 100);
  need(game.toggleHint() && game.data().showHint && game.data().hintsUsed == 1, "hint missing");
  game.toggleHint(); game.toggleHint();
  need(game.data().hintsUsed == 1, "same question charged twice for hint");
  game.pause(1100); need(game.elapsed(9000) == 1000, "paused clock changed");
  game.resume(9000); need(game.elapsed(9500) == 1500, "resume included paused duration");
  need(game.skip(9500), "skip rejected");
  need(!game.toggleHint() && !game.skip(9501), "pending notice accepted input");
  game.update(10500); game.resume(20000);
  need(game.data().score == 0 && game.elapsed(25000) == 1500, "skip or resume changed final result");
}
static void rolloverAndReset() {
  QuizEngine game(QUESTIONS, QUESTION_COUNT);
  const uint8_t round[] = {indexOf("K1")};
  game.start(round, 1, UINT32_MAX - 1000U);
  need(game.elapsed(1499) == 2500, "millis rollover changed duration");
  game.skip(1499); game.update(2499);
  need(game.elapsed(10000) == 2500, "rollover result not frozen");
  game.start(round, 1, 10001);
  need(game.data().score == 0 && game.data().index == 0 && game.elapsed(10001) == 0, "new round kept old state");
}
static void invalidRound() {
  QuizEngine game(QUESTIONS, QUESTION_COUNT);
  const uint8_t valid[] = {indexOf("P1")};
  need(game.start(valid, 1, 0), "valid round rejected");
  const uint8_t bad[] = {255};
  need(!game.start(nullptr, 1, 10) && !game.start(bad, 1, 10), "invalid round accepted");
  need(game.current() && !std::strcmp(game.current()->id, "P1"), "bad request destroyed valid round");
}
static void uidValues() {
  Uid uid = {}, saved = {};
  need(uidParse("04:A1:B2:C3", uid) && uid.size == 4, "UID parsing failed");
  saved = uid;
  need(!uidParse("04 A1 B2", uid) && uidEqual(uid, saved), "bad UID changed output");
  need(!uidParse("04A1B2CZ", uid) && !uidParse(nullptr, uid), "bad hex accepted");
  need(uidParse("01020304050607", uid) && uid.size == 7, "7-byte UID rejected");
  need(uidParse("0102030405060708090A", uid) && uid.size == 10, "10-byte UID rejected");
  char out[30]; uidFormat(saved, out, sizeof(out), true);
  need(!std::strcmp(out, "04 A1 B2 C3"), "UID formatting changed");
}
static void registryValues() {
  RegistryData data = {};
  data.magic = 0x474D5132; data.version = 1; data.activeMask = 1;
  data.tags[0][0] = {4, {4, 1, 1, 0xA5}};
  data.tags[0][1] = {4, {4, 1, 2, 0xA5}};
  need(registryBlobValid(data) && registryShapeReady(data, Shape::CUBE), "valid stored registry rejected");
  uint8_t reader = 255;
  need(registryFind(data, data.tags[0][1], reader) == Shape::CUBE && reader == 1, "stored reader role lost");
  data.tags[1][0] = data.tags[0][0];
  need(!registryBlobValid(data), "duplicate UID accepted");
  data.tags[1][0] = {}; data.activeMask = 0x80;
  need(!registryBlobValid(data), "invalid active mask accepted");
}
static void randomRounds() {
  std::set<unsigned> all;
  for (int i = 0; i < 100; ++i) {
    uint8_t out[ROUND_TARGET] = {};
    need(bankBuildRound(31, out, pick) == 5, "wrong five-shape round length");
    std::set<unsigned> ids, shapes;
    for (uint8_t q : out) { ids.insert(q); shapes.insert(uint8_t(QUESTIONS[q].answer)); all.insert(q); }
    need(ids.size() == 5 && shapes.size() == 5, "repeated ID or missing shape");
  }
  need(all.size() == 15, "some questions unreachable");
  uint8_t out[ROUND_TARGET] = {};
  need(bankBuildRound(1, out, pick) == 3, "single shape should yield three unique questions");
  for (uint8_t i = 0; i < 3; ++i) need(QUESTIONS[out[i]].answer == Shape::CUBE, "inactive shape selected");
  need(bankBuildRound(0, out, pick) == 0 && bankBuildRound(128, out, pick) == 0, "invalid mask accepted");
}
static void lcdSnapshots() {
  QuizEngine game(QUESTIONS, QUESTION_COUNT);
  const uint8_t round[] = {indexOf("P1")};
  AppState app = {AppMode::PLAY, -1, Shape::NONE, 0, false, 0};
  game.start(round, 1, 100);
  LcdFrame frame = buildLcdFrame({app, game.data(), game.current(), 14000, true, -1});
  need(!std::strcmp(frame.rows[0], "Q1/1 R1 00:14   S0/1"), "LCD header changed");
  need(!std::strcmp(frame.rows[1], "Bongkah apakah ini? "), "LCD question changed");
  game.toggleHint();
  frame = buildLcdFrame({app, game.data(), game.current(), 14000, true, -1});
  need(!std::strcmp(frame.rows[1], "HINT: Muka sisi akan"), "LCD hint changed");
  game.submit(0, Shape::PYRAMID, 0, 14000); game.submit(1, Shape::PYRAMID, 1, 14100); game.update(15000);
  frame = buildLcdFrame({app, game.data(), game.current(), game.elapsed(20000), true, -1});
  need(!std::strcmp(frame.rows[1], "Skor: 1/1 (100%)    "), "LCD summary score changed");
  need(!std::strcmp(frame.rows[2], "Masa akhir: 00:14   "), "LCD summary duration changed");
  const QuizData before = game.data();
  (void)buildLcdFrame({app, game.data(), game.current(), 99999, false, 0});
  need(!std::memcmp(&before, &game.data(), sizeof(before)), "rendering mutated quiz state");
}
namespace portsTest {
uint32_t now = 0;
RegistryData stored = {};
size_t storedSize = 0;
ScanMode mode = ScanMode::STOPPED;
bool open() { return true; }
size_t length() { return storedSize; }
size_t read(RegistryData &out) { out = stored; return storedSize; }
size_t write(const RegistryData &data) { stored = data; storedSize = sizeof(data); return storedSize; }
uint32_t clock() { return now; }
void log(const char *) {}
void setMode(ScanMode value) { mode = value; }
void fresh() {}
bool online(uint8_t reader) { return reader < 2; }
bool enabled(uint8_t reader) { return (reader == 0 && mode == ScanMode::R1) || (reader == 1 && mode == ScanMode::R2); }
}
static void injectedApplication() {
  using namespace portsTest;
  appBindPorts({clock, pick, log, {open, length, read, write}, setMode, fresh, online, enabled});
  registryBegin(); quizBegin(); appBegin();
  for (uint8_t s = 0; s < 5; ++s) for (uint8_t r = 0; r < 2; ++r) {
    const Uid uid = {4, {4, uint8_t(s + 1), uint8_t(r + 1), 0xA5}};
    need(registryAssign(r, Shape(s), uid), "injected storage registration failed");
  }
  appNextButton();
  need(appState().mode == AppMode::PLAY && quizState().length == 5, "application needed a device to start");
  const Question q = *quizCurrentQuestion(); now = 750;
  appHandleScan(0, registryState().tags[uint8_t(q.answer)][0]);
  need(quizState().score == 0 && mode == ScanMode::R2, "R1 must activate R2 without scoring");
  now = 850; appHandleScan(1, registryState().tags[uint8_t(q.answer)][1]);
  need(quizState().score == 1 && mode == ScanMode::STOPPED, "injected scan failed to score/stop reader");
  now = 1750; appUpdate();
  need(quizState().index == 1 && mode != ScanMode::STOPPED, "injected clock failed to advance");
  appStop(); now = 9000;
  need(quizElapsedMs() == 850, "injected clock included transition or menu time");
}
int main() {
  const std::pair<const char *, void(*)()> tests[] = {
    {"two_card_routing_award_and_final_freeze", scoring},
    {"exact_blinks_skips_and_stopwatch", blinkAndSkip}, {"stage_retries_roles_and_hint_colours", stageRetry}, {"hint_pause_resume_skip", hintAndPause},
    {"clock_rollover_and_new_round", rolloverAndReset}, {"invalid_round_keeps_current_state", invalidRound},
    {"uid_value_validation", uidValues}, {"persisted_registry_validation", registryValues},
    {"random_round_coverage_and_filtering", randomRounds}, {"lcd_from_immutable_snapshot", lcdSnapshots},
    {"application_runs_only_with_injected_ports", injectedApplication}
  };
  unsigned failures = 0;
  for (const auto &test : tests) {
    try { test.second(); std::cout << "PASS " << test.first << '\n'; }
    catch (const std::exception &e) { ++failures; std::cout << "FAIL " << test.first << ": " << e.what() << '\n'; }
  }
  const unsigned count = sizeof(tests) / sizeof(tests[0]);
  std::cout << (count - failures) << "/" << count << " core/application cases passed\n";
  return failures ? 1 : 0;
}
