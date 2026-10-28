#pragma once
#include "lcd_frame.h"
#include "../application/app.h"
#include "../domain/quiz_engine.h"
#include "../domain/registry.h"
#include <cstring>
#include <cstdio>

struct LcdViewState {
  const AppState &app;
  const QuizData &quiz;
  const Question *question;
  uint32_t elapsedMs;
  bool ready;
  int8_t lastReader;
};

const char *const LCD_INSTRUCTIONS[INSTRUCTION_PAGE_COUNT][2] = {
  {"Soalan bongkah:", "R1 dahulu -> R2"},
  {"Soalan bentangan:", "R2 dahulu -> R1"},
  {"Biru: Menunggu kad", "Reader kedua padam"},
  {"Kad pertama betul:", "Hijau kekal; +0"},
  {"Dua kad sepadan:", "Betul kedua-dua: +1"},
  {"Kelip hijau 3 kali", "Auto soalan baharu"},
  {"Satu kad salah: +0", "Dua LED kelip merah"},
  {"Merah berterusan", "Lihat jawapan+sebab"},
  {"NEXT/TERUSKAN:", "Ke soalan seterusnya"},
  {"Masa jeda: Kelipan", "hijau & skrin salah"},
  {"HINT: Petunjuk ungu", "Pada reader aktif"},
  {"HINT lagi: Soalan", "Masa hint berjalan"},
  {"NEXT: Langkau (+0)", "3 kelip merah, jeda"},
  {"Soalan akhir tamat:", "Paparan keputusan"},
  {"Angkat & imbas baru", "Kad ikut LED biru"}
};

inline void lcdPutRow(char rows[4][21], uint8_t row, const char *text) {
  if (row >= 4 || !text) return;
  size_t n = strlen(text); if (n > 20) n = 20;
  memcpy(rows[row], text, n);
}

inline void lcdPutCentered(char rows[4][21], uint8_t row, const char *text) {
  if (row >= 4 || !text) return;
  size_t n = strlen(text); if (n > 20) n = 20;
  memcpy(rows[row] + (20 - n) / 2, text, n);
}

inline void lcdMenu(char rows[4][21], const LcdViewState &view) {
  if (view.app.showInstructions) {
    const uint8_t page = view.app.instructionPage < INSTRUCTION_PAGE_COUNT ? view.app.instructionPage : 0;
    char title[21];
    snprintf(title, sizeof(title), "CARA MAIN %u/%u", unsigned(page + 1), unsigned(INSTRUCTION_PAGE_COUNT));
    lcdPutRow(rows, 0, title);
    lcdPutRow(rows, 1, LCD_INSTRUCTIONS[page][0]);
    lcdPutRow(rows, 2, LCD_INSTRUCTIONS[page][1]);
    lcdPutRow(rows, 3, page + 1 == INSTRUCTION_PAGE_COUNT ? "HINT: Menu utama" : "HINT: Seterusnya");
    return;
  }
  lcdPutCentered(rows, 0, "GeoDecoder");
  lcdPutCentered(rows, 1, !view.ready
                 ? "Minta bantuan guru" : "Jom uji minda 3D!");
  lcdPutRow(rows, 2, "NEXT: Mula bermain");
  lcdPutRow(rows, 3, "HINT: Cara bermain");
}

inline void lcdQuizHeader(char rows[4][21], const QuizData &quiz, uint32_t elapsedMs) {
  char text[21], duration[16];
  snprintf(text, sizeof(text), "Q%u/%u", unsigned(quiz.index + 1), unsigned(quiz.length));
  lcdPutRow(rows, 0, text);
  formatQuizTime(elapsedMs, duration, sizeof(duration));
  const size_t n = strlen(duration);
  // Q1/5 R1 00:14   S0/5. The stage remains visible with ordinary LEDs too.
  const size_t position = n <= 5 ? 8 : 8 - (n - 4) / 2;
  if (position >= 7) memcpy(rows[0] + 5, quiz.stage == AnswerStage::SOLID ? "R1" : "R2", 2);
  if (position + n <= 16) memcpy(rows[0] + position, duration, n);
  snprintf(text, sizeof(text), "S%u/%u", unsigned(quiz.score), unsigned(quiz.length));
  const size_t scoreLength = strlen(text);
  if (scoreLength <= 20) memcpy(rows[0] + 20 - scoreLength, text, scoreLength);
}

inline void lcdQuizBody(char rows[4][21], const QuizData &quiz, const Question &q) {
  if (quiz.feedback == Feedback::RIGHT || quiz.feedback == Feedback::SKIPPED) {
    lcdPutRow(rows, 1, quiz.feedback == Feedback::RIGHT ? "Jawapan betul!" : "Soalan dilangkau.");
    lcdPutRow(rows, 2, quiz.feedback == Feedback::RIGHT ? "Markah: +1" : "Markah: +0");
    lcdPutRow(rows, 3, quiz.index + 1 == quiz.length ? "Pusingan selesai." : "Ke soalan seterusnya");
  } else if (quiz.feedback == Feedback::UNKNOWN_UID) {
    lcdPutRow(rows, 1, "Kad belum didaftar");
    lcdPutRow(rows, 2, "Minta bantuan guru");
    lcdPutRow(rows, 3, "Cuba kad yang sah.");
  } else if (quiz.feedback == Feedback::WRONG_PAD) {
    lcdPutRow(rows, 1, "Ikut LED menyala.");
    lcdPutRow(rows, 2, "Pilih kad yang betul");
    lcdPutRow(rows, 3, "Angkat kad & imbas.");
  } else {
    for (uint8_t r = 0; r < 3; ++r) lcdPutRow(rows, r + 1, quiz.showHint ? q.hint[r] : q.lines[r]);
  }
}

inline LcdFrame buildLcdFrame(const LcdViewState &view) {
  LcdFrame frame = {};
  auto &rows = frame.rows;
  const QuizData &quiz = view.quiz;
  char text[80];
  memset(rows, ' ', sizeof(rows));
  for (uint8_t r = 0; r < 4; ++r) rows[r][20] = '\0';
  if (view.app.mode == AppMode::ENROLL) {
    lcdPutCentered(rows, 0, "GeoDecoder");
    lcdPutCentered(rows, 1, shapeLabel(view.app.enrollShape));
    lcdPutRow(rows, 2, view.app.enrollReader == 0 ? "Imbas kad bongkah" : "Imbas kad bentangan");
    lcdPutRow(rows, 3, "NEXT: Batal daftar");
  } else if (view.app.mode == AppMode::UID_SCAN) {
    lcdPutCentered(rows, 0, "GeoDecoder");
    lcdPutCentered(rows, 1, view.lastReader < 0 ? "Semakan kad" : "Kad berjaya dibaca");
    lcdPutRow(rows, 2, view.lastReader < 0 ? "Imbas ikut LED" : "Angkat & imbas lagi");
    lcdPutRow(rows, 3, "NEXT: Menu utama");
  } else if (view.app.mode == AppMode::PLAY && quiz.phase == QuizPhase::SUMMARY) {
    lcdPutCentered(rows, 0, "PUSINGAN SELESAI");
    const unsigned pct = quiz.length ? unsigned(quiz.score) * 100U / quiz.length : 0;
    snprintf(text, sizeof(text), "Skor: %u/%u (%u%%)", unsigned(quiz.score), unsigned(quiz.length), pct);
    lcdPutRow(rows, 1, text);
    char duration[16]; formatQuizTime(view.elapsedMs, duration, sizeof(duration));
    snprintf(text, sizeof(text), "Masa akhir: %s", duration);
    lcdPutRow(rows, 2, text);
    lcdPutRow(rows, 3, "NEXT:Lagi HINT:Menu");
  } else if (view.app.mode == AppMode::PLAY && view.question && quiz.phase == QuizPhase::WRONG_ANSWER) {
    lcdPutRow(rows, 0, "SALAH +0 NEXT:Terus");
    snprintf(text, sizeof(text), "Jawapan: %s", shapeShortLabel(view.question->answer));
    lcdPutRow(rows, 1, text);
    lcdPutRow(rows, 2, view.question->explanation[0]);
    lcdPutRow(rows, 3, view.question->explanation[1]);
  } else if (view.app.mode == AppMode::PLAY && view.question) {
    lcdQuizHeader(rows, quiz, view.elapsedMs);
    lcdQuizBody(rows, quiz, *view.question);
  } else lcdMenu(rows, view);
  return frame;
}
