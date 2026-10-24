#pragma once
#include "../domain/types.h"

struct AppState {
  AppMode mode;
  int8_t enrollReader;
  Shape enrollShape;
  uint32_t enrollStarted;
  bool showInstructions;
  uint8_t instructionPage;
};
const AppState &appState();
void appBegin();
void appUpdate();
void appNextButton();
void appHintButton();
bool appPlay(bool newRound);
void appStop();
void appInspect(ScanMode mode);
bool appEnroll(uint8_t reader, Shape shape);
void appConfigurationChanged();
void appHandleScan(uint8_t reader, const Uid &uid);
bool appInputBlocked();
RgbColor appReaderColor(uint8_t reader);
