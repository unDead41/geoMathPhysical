QuizData quiz = {};

uint32_t quizElapsedMs() {
  return quiz.elapsedMs + (quiz.clockRunning ? uint32_t(millis() - quiz.clockStartedMs) : 0);
}

void quizPauseClock() {
  if (!quiz.clockRunning) return;
  quiz.elapsedMs = quizElapsedMs();
  quiz.clockRunning = false;
}

void quizResumeClock() {
  if (quiz.phase != QuizPhase::QUESTION || quiz.clockRunning || quiz.clockFinished) return;
  quiz.clockStartedMs = millis();
  quiz.clockRunning = true;
}

void quizFinishClock() {
  quizPauseClock();
  quiz.clockFinished = true;
}

void quizFormatTime(char *out, size_t capacity) {
  if (!out || !capacity) return;
  const uint32_t seconds = quizElapsedMs() / 1000U;
  // Kekal minit:saat. Nilai minit boleh berkembang melebihi dua digit.
  snprintf(out, capacity, "%02lu:%02lu", static_cast<unsigned long>(seconds / 60U),
           static_cast<unsigned long>(seconds % 60U));
}

void quizBegin() { quizDiscard(); }

void quizDiscard() {
  quiz = {};
  quiz.phase = QuizPhase::SETUP;
}

void quizClearCurrent() {
  quiz.awarded = quiz.showHint = quiz.hintUsedHere = quiz.advancePending = false;
  quiz.feedback = Feedback::WAITING;
  quiz.feedbackStartedMs = 0;
}

const Question *quizCurrentQuestion() {
  if (quiz.phase != QuizPhase::QUESTION || quiz.index >= quiz.length) return nullptr;
  return &QUESTIONS[quiz.order[quiz.index]];
}

void quizArmCurrentReader() {
  const Question *q = quizCurrentQuestion();
  if (!q || quiz.advancePending) { rfidSetMode(ScanMode::STOPPED); return; }
  rfidSetMode(q->reader == 0 ? ScanMode::R1 : ScanMode::R2);
  rfidRequireFreshCards();
}

bool quizStartRound() {
  if (!registryActiveReady()) {
    Serial.println(F("[ERROR] Daftar UID R1 dan R2 bagi jenis aktif, atau pilih jenis lengkap dengan use."));
    registryPrintActive(); return false;
  }
  uint8_t selected[ROUND_TARGET] = {};
  const uint8_t count = bankBuildRound(registryData.activeMask, selected);
  if (!count) { Serial.println(F("[ERROR] Bank soalan tidak mencukupi.")); return false; }
  quizDiscard();
  memcpy(quiz.order, selected, count);
  quiz.length = count;
  quiz.phase = QuizPhase::QUESTION;
  quizClearCurrent();
  quizResumeClock();
  Serial.printf("\n[ROUND] %u soalan; satu jawapan setiap soalan; tiada ID soalan berulang.\n", unsigned(count));
  quizPrintQuestion();
  return true;
}

void quizPrintQuestion() {
  const Question *q = quizCurrentQuestion();
  if (!q) return;
  Serial.printf("[Q %u/%u | %s] %s\nImbas SATU kad %s di R%u mengikut LED.\n",
                unsigned(quiz.index + 1), unsigned(quiz.length), q->id, q->fullText,
                q->reader == 0 ? "bongkah" : "bentangan", unsigned(q->reader + 1));
}

void quizPrintScore() {
  const unsigned pct = quiz.length ? unsigned(quiz.score) * 100U / quiz.length : 0;
  char duration[16]; quizFormatTime(duration, sizeof(duration));
  Serial.printf("[SCORE] %u/%u (%u%%) | salah=%u | soalan guna hint=%u | masa=%s\n",
                unsigned(quiz.score), unsigned(quiz.length), pct,
                unsigned(quiz.wrongAttempts), unsigned(quiz.hintsUsed), duration);
}

void quizQueueAdvance(Feedback feedback) {
  quiz.feedback = feedback;
  quiz.feedbackStartedMs = millis();
  quiz.advancePending = true;
  quiz.showHint = false;
  if (quiz.index + 1 >= quiz.length) quizFinishClock();
  rfidSetMode(ScanMode::STOPPED);
}

void quizNext() {
  if (appMode != AppMode::PLAY) return;
  if (quiz.phase == QuizPhase::SUMMARY || quiz.phase == QuizPhase::SETUP) {
    appPlay(true); return;
  }
  if (quiz.advancePending || quiz.awarded) return;
  Serial.println(F("[SKIP] +0 markah. Soalan seterusnya selepas notis ringkas."));
  quizQueueAdvance(Feedback::SKIPPED);
}

void quizUpdate() {
  if (appMode != AppMode::PLAY || quiz.phase != QuizPhase::QUESTION) return;
  const uint32_t age = uint32_t(millis() - quiz.feedbackStartedMs);
  if (quiz.advancePending) {
    if (age < QUIZ_NOTICE_MS) return;
    quiz.advancePending = false;
    if (quiz.index + 1 >= quiz.length) {
      quizFinishClock();
      quiz.phase = QuizPhase::SUMMARY;
      rfidSetMode(ScanMode::STOPPED);
      Serial.println(F("[ROUND TAMAT] NEXT=main semula, HINT=menu utama."));
      quizPrintScore();
    } else {
      ++quiz.index;
      quizClearCurrent();
      quizArmCurrentReader();
      quizPrintQuestion();
    }
  } else if (quiz.feedback != Feedback::WAITING && age >= QUIZ_ERROR_MS) {
    quiz.feedback = Feedback::WAITING;
  }
}

void quizHint() {
  if (appMode != AppMode::PLAY || !quizCurrentQuestion() || quiz.advancePending) return;
  quiz.showHint = !quiz.showHint;
  quiz.feedback = Feedback::WAITING;
  if (quiz.showHint) {
    if (!quiz.hintUsedHere) { quiz.hintUsedHere = true; ++quiz.hintsUsed; }
    const Question &q = *quizCurrentQuestion();
    Serial.printf("[HINT] %s %s %s\n", q.hint[0], q.hint[1], q.hint[2]);
  } else Serial.println(F("[HINT] Kembali ke soalan yang sama."));
}

void quizRetry() {
  if (quiz.phase != QuizPhase::QUESTION || quiz.advancePending || quiz.awarded) return;
  quiz.feedback = Feedback::WAITING;
  quiz.showHint = false;
  quizArmCurrentReader();
  Serial.println(F("[RETRY] Angkat kad dan imbas semula. Markah dikekalkan."));
}

void quizOnScan(uint8_t reader, const Uid &uid) {
  const Question *q = quizCurrentQuestion();
  if (appMode != AppMode::PLAY || reader >= READER_COUNT || !q || quiz.advancePending || quiz.awarded) return;
  uint8_t registeredReader;
  const Shape found = registryLookup(uid, registeredReader);
  quiz.feedbackStartedMs = millis();
  if (reader != q->reader || (found != Shape::NONE && registeredReader != q->reader)) {
    quiz.feedback = Feedback::WRONG_PAD;
    Serial.println(F("[READER] Imbas kad yang betul mengikut LED pembaca semasa."));
    return;
  }
  if (found == Shape::NONE) {
    quiz.feedback = Feedback::UNKNOWN_UID;
    Serial.println(F("[UID] Kad belum didaftarkan. Guru boleh guna assign."));
    return;
  }
  if (found == q->answer) {
    quiz.awarded = true;
    ++quiz.score;
    Serial.println(F("[TEPAT] +1 markah daripada SATU imbasan. Beralih selepas notis."));
    quizQueueAdvance(Feedback::RIGHT);
    quizPrintScore();
  } else {
    quiz.feedback = Feedback::WRONG;
    if (quiz.wrongAttempts < UINT16_MAX) ++quiz.wrongAttempts;
    Serial.println(F("[SALAH] Cuba jawapan lain untuk soalan yang sama."));
  }
}

RgbColor quizColor() {
  if (appMode != AppMode::PLAY) return RgbColor::OFF;
  if (quiz.phase == QuizPhase::SUMMARY || quiz.awarded) return RgbColor::GREEN;
  if (quiz.phase != QuizPhase::QUESTION) return RgbColor::OFF;
  if (quiz.feedback == Feedback::WRONG || quiz.feedback == Feedback::UNKNOWN_UID ||
      quiz.feedback == Feedback::WRONG_PAD) return RgbColor::RED;
  if (quiz.showHint || quiz.feedback == Feedback::SKIPPED) return RgbColor::YELLOW;
  return RgbColor::BLUE;
}

RgbColor quizReaderColor(uint8_t reader) {
  if (reader >= READER_COUNT || appMode != AppMode::PLAY) return RgbColor::OFF;
  if (quiz.phase == QuizPhase::SUMMARY) return RgbColor::GREEN;
  const Question *q = quizCurrentQuestion();
  return q && q->reader == reader ? quizColor() : RgbColor::OFF;
}
