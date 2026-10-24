#pragma once
#include "../presentation/lcd_frame.h"
void lcdBegin();
bool lcdIsReady();
void lcdRender(const LcdFrame &frame);
