#pragma once
#include "../domain/types.h"
#include "../presentation/lcd_frame.h"

// Hardware integration utility; game domain/application do not depend on it.
void componentTestsBegin();
bool componentTestsActive();
void componentTestsCommand(const char *path);
void componentTestsStop();
void componentTestsUpdate();
RgbColor componentTestsReaderColor(uint8_t reader);
LcdFrame componentTestsLcdFrame();
