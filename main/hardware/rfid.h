#pragma once
#include "../domain/types.h"
struct ReaderRecord {
  Uid uid;
  uint8_t version, misses;
  bool online, present, requireRemoval;
  uint32_t count;
};
void rfidBegin();
void rfidCheckConnections();
void rfidUpdate();
void rfidSetMode(ScanMode mode);
void rfidRequireFreshCards();
bool rfidPadsArmed();
bool rfidReaderEnabled(uint8_t reader);
const ReaderRecord &rfidGetRecord(uint8_t reader);
int8_t rfidGetLastReader();
ScanMode rfidGetMode();
