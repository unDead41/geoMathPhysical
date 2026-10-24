#pragma once
#include "../domain/types.h"

const QuizData &quizState();
void quizBegin();
void quizDiscard();
bool quizStartRound();
uint8_t bankBuildRound(uint8_t activeMask, uint8_t *out);
void quizNext();
void quizUpdate();
void quizArmCurrentReader();
void quizHint();
void quizRetry();
void quizOnScan(uint8_t reader, const Uid &uid);
const Question *quizCurrentQuestion();
uint8_t quizActiveReader();
void quizPrintQuestion();
void quizPrintScore();
uint32_t quizElapsedMs();
void quizPauseClock();
void quizResumeClock();
void quizFinishClock();
void quizFormatTime(char *out, size_t capacity);
RgbColor quizReaderColor(uint8_t reader);
