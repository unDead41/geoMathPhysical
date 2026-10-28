#pragma once
#include "types.h"
#include <cstring>
#include <cstdio>

enum class QuizTransition : uint8_t { NONE, QUESTION, SUMMARY };

inline void formatQuizTime(uint32_t milliseconds, char *out, size_t capacity) {
  if (!out || !capacity) return;
  const uint32_t seconds = milliseconds / 1000U;
  std::snprintf(out, capacity, "%02lu:%02lu",
                static_cast<unsigned long>(seconds / 60U),
                static_cast<unsigned long>(seconds % 60U));
}

// No clocks, logging, drivers or global state: every external fact is an input.
class QuizEngine {
 public:
  QuizEngine(const Question *bank, uint8_t count) : bank_(bank), count_(count) { reset(); }
  const QuizData &data() const { return data_; }
  uint8_t activeReader() const { return data_.stage == AnswerStage::SOLID ? 0 : 1; }
  const Question *current() const {
    if ((data_.phase != QuizPhase::QUESTION && data_.phase != QuizPhase::WRONG_ANSWER) ||
        data_.index >= data_.length ||
        data_.order[data_.index] >= count_) return nullptr;
    return &bank_[data_.order[data_.index]];
  }
  void reset() { data_ = {}; data_.phase = QuizPhase::SETUP; }
  uint32_t elapsed(uint32_t now) const {
    return data_.elapsedMs + (data_.clockRunning ? uint32_t(now - data_.clockStartedMs) : 0);
  }
  void pause(uint32_t now) {
    if (!data_.clockRunning) return;
    data_.elapsedMs = elapsed(now);
    data_.clockRunning = false;
  }
  void resume(uint32_t now) {
    if (data_.phase != QuizPhase::QUESTION || data_.advancePending ||
        data_.clockRunning || data_.clockFinished) return;
    data_.clockStartedMs = now; data_.clockRunning = true;
  }
  void finish(uint32_t now) { pause(now); data_.clockFinished = true; }
  bool start(const uint8_t *order, uint8_t length, uint32_t now) {
    if (!bank_ || !order || !length || length > ROUND_TARGET) return false;
    for (uint8_t i = 0; i < length; ++i) if (order[i] >= count_) return false;
    reset();
    std::memcpy(data_.order, order, length);
    data_.length = length; data_.phase = QuizPhase::QUESTION;
    clearCurrent(); resume(now);
    return true;
  }
  bool skip(uint32_t now) {
    if (data_.phase != QuizPhase::QUESTION || !current() || data_.advancePending || data_.awarded) return false;
    queueAdvance(Feedback::SKIPPED, now);
    return true;
  }
  QuizTransition continueAfterWrong(uint32_t now) {
    if (data_.phase != QuizPhase::WRONG_ANSWER) return QuizTransition::NONE;
    return advance(now);
  }
  bool toggleHint() {
    if (data_.phase != QuizPhase::QUESTION || !current() || data_.advancePending) return false;
    data_.showHint = !data_.showHint; data_.feedback = Feedback::WAITING;
    if (data_.showHint && !data_.hintUsedHere) {
      data_.hintUsedHere = true; ++data_.hintsUsed;
    }
    return true;
  }
  bool retry() {
    if (data_.phase != QuizPhase::QUESTION || !current() || data_.advancePending || data_.awarded) return false;
    data_.stage = firstStage(); data_.firstAccepted = false;
    data_.feedback = Feedback::WAITING; data_.showHint = false;
    return true;
  }
  bool submit(uint8_t reader, Shape answer, uint8_t registeredReader, uint32_t now) {
    const Question *q = current();
    if (reader >= READER_COUNT || data_.phase != QuizPhase::QUESTION || !q || data_.advancePending || data_.awarded ||
        reader != activeReader()) return false;
    data_.feedbackStartedMs = now;
    if (answer != Shape::NONE && registeredReader != activeReader())
      data_.feedback = Feedback::WRONG_PAD;
    else if (answer == Shape::NONE) data_.feedback = Feedback::UNKNOWN_UID;
    else if (answer == q->answer) {
      if (!data_.firstAccepted) {
        data_.firstAccepted = true;
        data_.stage = data_.stage == AnswerStage::SOLID ? AnswerStage::NET : AnswerStage::SOLID;
        data_.feedback = Feedback::WAITING; data_.showHint = false;
      } else {
        data_.awarded = true; ++data_.score; queueAdvance(Feedback::RIGHT, now);
      }
    } else {
      data_.feedback = Feedback::WRONG;
      if (data_.wrongAttempts < UINT16_MAX) ++data_.wrongAttempts;
      data_.phase = QuizPhase::WRONG_ANSWER;
      data_.showHint = false; data_.blinkStep = 0;
      pause(now);
      if (data_.index + 1 >= data_.length) finish(now);
    }
    return true;
  }
  QuizTransition update(uint32_t now) {
    const uint32_t age = uint32_t(now - data_.feedbackStartedMs);
    if (data_.phase == QuizPhase::WRONG_ANSWER) {
      data_.blinkStep = uint8_t((age / QUIZ_BLINK_HALF_MS) % 2U);
      return QuizTransition::NONE;
    }
    if (data_.phase != QuizPhase::QUESTION) return QuizTransition::NONE;
    if (data_.advancePending) {
      if (age < QUIZ_NOTICE_MS) {
        data_.blinkStep = uint8_t(age / QUIZ_BLINK_HALF_MS);
        return QuizTransition::NONE;
      }
      return advance(now);
    }
    if (data_.feedback != Feedback::WAITING && age >= QUIZ_ERROR_MS)
      data_.feedback = Feedback::WAITING;
    return QuizTransition::NONE;
  }
  RgbColor readerColor(uint8_t reader) const {
    if (reader >= READER_COUNT) return RgbColor::OFF;
    const Question *q = current();
    if (!q) return RgbColor::OFF;
    if (data_.advancePending || data_.phase == QuizPhase::WRONG_ANSWER) {
      if (data_.blinkStep % 2) return RgbColor::OFF;
      return data_.feedback == Feedback::RIGHT ? RgbColor::GREEN : RgbColor::RED;
    }
    if (data_.firstAccepted && reader != activeReader()) return RgbColor::GREEN;
    if (reader != activeReader()) return RgbColor::OFF;
    if (data_.feedback == Feedback::WRONG || data_.feedback == Feedback::UNKNOWN_UID ||
        data_.feedback == Feedback::WRONG_PAD) return RgbColor::RED;
    return data_.showHint ? RgbColor::MAGENTA : RgbColor::BLUE;
  }
 private:
  AnswerStage firstStage() const {
    return bank_[data_.order[data_.index]].focus == QuestionFocus::NET ? AnswerStage::NET : AnswerStage::SOLID;
  }
  QuizTransition advance(uint32_t now) {
    data_.advancePending = false;
    if (data_.index + 1 >= data_.length) {
      finish(now); data_.phase = QuizPhase::SUMMARY;
      return QuizTransition::SUMMARY;
    }
    ++data_.index; data_.phase = QuizPhase::QUESTION;
    clearCurrent(); resume(now);
    return QuizTransition::QUESTION;
  }
  void clearCurrent() {
    data_.awarded = data_.showHint = data_.hintUsedHere = data_.advancePending = false;
    data_.firstAccepted = false;
    data_.feedback = Feedback::WAITING; data_.feedbackStartedMs = 0;
    data_.stage = firstStage(); data_.blinkStep = 0;
  }
  void queueAdvance(Feedback feedback, uint32_t now) {
    data_.feedback = feedback; data_.feedbackStartedMs = now;
    data_.advancePending = true; data_.showHint = false;
    data_.blinkStep = 0;
    pause(now);
    if (data_.index + 1 >= data_.length) finish(now);
  }
  const Question *bank_;
  uint8_t count_;
  QuizData data_;
};
