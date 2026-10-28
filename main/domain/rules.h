#pragma once
#include <cstdint>

// Application policy only; GPIOs and electrical timing belong in config.h.
constexpr uint8_t READER_COUNT = 2;
constexpr uint8_t SHAPE_COUNT = 5;
constexpr uint8_t ALL_SHAPES_MASK = (1U << SHAPE_COUNT) - 1;
constexpr uint8_t DEFAULT_ACTIVE_MASK = ALL_SHAPES_MASK;
constexpr uint8_t ROUND_TARGET = 5, QUESTIONS_PER_SHAPE = 3;
constexpr uint8_t INSTRUCTION_PAGE_COUNT = 8;
constexpr uint8_t QUIZ_BLINK_COUNT = 3;
constexpr uint16_t QUIZ_BLINK_HALF_MS = 150;
constexpr uint16_t QUIZ_NOTICE_MS = QUIZ_BLINK_COUNT * 2 * QUIZ_BLINK_HALF_MS;
constexpr uint16_t QUIZ_ERROR_MS = 1200;
constexpr uint16_t MENU_COLOR_MS = 1000, SUMMARY_COLOR_MS = 150;
constexpr uint32_t ENROLL_TIMEOUT_MS = 30000;
static_assert(ROUND_TARGET <= 10 && ROUND_TARGET > 0, "Saiz round mesti 1..10.");
