#pragma once
#include <cstdint>
void serialBegin();
void serialUpdate();
void serialExecute(char *line);
void serialPrintHelp();
void serialPrintPins();
void serialPrintStatus();
void serialPrintUid(uint8_t reader);
void serialPrintBank();
void serialLog(const char *text);
