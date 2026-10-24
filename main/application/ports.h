#pragma once
#include "../domain/types.h"

struct StoragePort {
  bool (*open)();
  size_t (*length)();
  size_t (*read)(RegistryData &out);
  size_t (*write)(const RegistryData &data);
};

// Bound once by setup(). Application modules know contracts, never Arduino drivers.
struct AppPorts {
  uint32_t (*now)();
  RandomIndex randomIndex;
  void (*log)(const char *text);
  StoragePort storage;
  void (*setReaderMode)(ScanMode mode);
  void (*requireFreshCards)();
  bool (*readerOnline)(uint8_t reader);
  bool (*readerEnabled)(uint8_t reader);
};
void appBindPorts(const AppPorts &ports);
const AppPorts &appPorts();
void appLogf(const char *format, ...);
