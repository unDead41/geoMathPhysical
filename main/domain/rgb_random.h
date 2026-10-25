#pragma once
#include "types.h"

// Draw directly from the allowed palette: no OFF, previous colour or paired LED.
// At most two colours are excluded, so one bounded draw always has 5..7 choices.
inline RgbColor pickRandomRgbColor(RgbColor previous, RgbColor paired, RandomIndex pick) {
  RgbColor allowed[7];
  uint8_t count = 0;
  for (uint8_t step = 0; step < 7; ++step) {
    const RgbColor colour = RgbColor(1 + (uint8_t(previous) + step) % 7);
    if (colour != previous && colour != paired) allowed[count++] = colour;
  }
  return allowed[pick(count)];
}
