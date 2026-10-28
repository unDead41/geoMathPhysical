// Additional regressions for LCD guidance, wrong-review handoff and both focus orders.
static void focus_wrong_wait_and_next() {
  for (const char *id : {"P1","C3"}) for (bool secondWrong : {false,true}) for (bool last : {false,true}) {
    fixture(); start(); if (last) testQuiz().index = testQuiz().length-1;
    select(id); testQuiz().score = 2;
    const Question q = *quizCurrentQuestion();
    if (secondWrong) quizOnScan(uint8_t(q.focus),tag(q.answer,uint8_t(q.focus)));
    const uint8_t reader = secondWrong ? 1-uint8_t(q.focus) : uint8_t(q.focus);
    quizOnScan(reader,tag(Shape::CUBOID,reader));
    need(rfidGetMode() == ScanMode::STOPPED, "wrong review left reader scanning");
    const uint8_t index = quizState().index;
    const uint32_t frozen = quizElapsedMs(), wrongAt = sim::now;
    for (unsigned offset : {0U,149U,150U,299U,300U,899U,900U,2100U,15001U}) {
      sim::now = wrongAt+offset; loop();
      const RgbColor colour = offset/150%2 ? RgbColor::OFF : RgbColor::RED;
      need(appReaderColor(0) == colour && appReaderColor(1) == colour,
           "wrong red blink stopped, drifted or only affected one reader");
      quizOnScan(reader,tag(q.answer,reader)); appHintButton(); command("retry"); command("clear");
      need(quizState().score == 2 && quizState().wrongAttempts == 1 && quizState().feedback == Feedback::WRONG,
           "final wrong answer reopened or altered score");
      need(quizState().index == index && quizElapsedMs() == frozen, "wrong review advanced or ran timer");
    }
    appNextButton();
    if (last) {
      need(quizState().phase == QuizPhase::SUMMARY, "last wrong NEXT did not open results");
      advance(2000); need(quizElapsedMs() == frozen, "last wrong result clock resumed");
    } else {
      need(quizState().index == index+1 && quizState().phase == QuizPhase::QUESTION,
           "wrong NEXT should immediately open one new question");
      advance(100); need(quizElapsedMs() == frozen+100, "time failed to resume on next question");
    }
  }
}

static void wrong_next_hold_and_hint_debounce() {
  for (bool last : {false,true}) {
    fixture(); start(); if (last) testQuiz().index = testQuiz().length-1;
    select("P1"); quizOnScan(0,tag(Shape::CUBE,0));
    const uint8_t index = quizState().index;
    sim::pins[BUTTON_PINS[0]] = LOW; advance(20);
    sim::pins[BUTTON_PINS[1]] = LOW; advance(2021);
    if (last) need(quizState().phase == QuizPhase::SUMMARY && quizState().index == index,
                   "held wrong NEXT reset results");
    else need(quizState().index == index+1 && !quizState().advancePending && !quizState().showHint,
              "held NEXT or pending wrong HINT affected following question");
    sim::pins[BUTTON_PINS[0]] = HIGH; sim::pins[BUTTON_PINS[1]] = HIGH; advance(41);
    if (!last) {
      sim::pins[BUTTON_PINS[1]] = LOW; advance(41);
      need(quizState().showHint, "fresh HINT after wrong-review release was lost");
      sim::pins[BUTTON_PINS[0]] = LOW; advance(41); advance(1000);
      need(quizState().index == index+2, "held fresh NEXT skipped more than one question");
    }
  }
}

static void focus_nonanswers_are_help() {
  for (const char *id : {"P1","C3"}) for (bool secondStage : {false,true}) {
    fixture(); start(); select(id); const Question q=*quizCurrentQuestion();
    if (secondStage) quizOnScan(uint8_t(q.focus),tag(q.answer,uint8_t(q.focus)));
    const uint8_t reader = secondStage ? 1-uint8_t(q.focus) : uint8_t(q.focus);
    const Uid unknown={4,{9,8,7,6}};
    const uint32_t before=quizElapsedMs(); appHintButton();
    quizOnScan(reader,unknown);
    need(quizState().feedback == Feedback::UNKNOWN_UID, "unknown UID treated as an answer");
    lcdUpdate(); need(std::string(sim::lcdCells[1]).find("Kad belum didaftar") == 0, "unknown UID help missing");
    advance(1200); need(quizState().showHint && quizState().wrongAttempts == 0 && quizElapsedMs() == before+1200,
                        "unknown UID finalized a wrong answer or froze time");
    quizOnScan(reader,tag(q.answer,1-reader));
    need(quizState().feedback == Feedback::WRONG_PAD, "wrong card role accepted");
    advance(1200); need(quizState().wrongAttempts == 0 && quizState().showHint, "wrong-role help finalized answer");
    advance(3000); // No RF response/scan event is not a wrong answer.
    need(quizState().clockRunning && quizState().wrongAttempts == 0, "reader silence became wrong answer");
    quizOnScan(reader,tag(q.answer,reader));
    if (!secondStage) quizOnScan(1-reader,tag(q.answer,1-reader));
    need(quizState().score == 1, "valid pair rejected after non-answer help");
  }
}

static void focus_skip_both_orders() {
  for (const char *id : {"P1","C3"}) for (bool secondStage : {false,true}) {
    fixture(); start(); select(id); const Question q=*quizCurrentQuestion();
    if (secondStage) quizOnScan(uint8_t(q.focus),tag(q.answer,uint8_t(q.focus)));
    const uint32_t frozen=quizElapsedMs(); appNextButton();
    need(quizState().feedback==Feedback::SKIPPED && quizState().score==0,"focus skip scored or became wrong review");
    advance(899); need(quizState().index==0 && quizElapsedMs()==frozen,"focus skip advanced early/ran time");
    advance(1); need(quizState().index==1 && quizState().clockRunning,"focus skip failed to advance at 900ms");
  }
}
