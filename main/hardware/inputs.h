#pragma once
#include "../domain/types.h"

struct InputEvents {
  void (*next)();
  void (*hint)();
  bool (*buttonsBlocked)();
  void (*scan)(uint8_t reader, const Uid &uid);
};
// One inline function-local instance across translation units (C++11 ODR).
namespace geodecoder_hardware_detail {
inline InputEvents &inputSlot() {
  static InputEvents events = {};
  return events;
}
}
inline const InputEvents &hardwareInputs() { return geodecoder_hardware_detail::inputSlot(); }
inline void hardwareBindInputs(const InputEvents &events) {
  geodecoder_hardware_detail::inputSlot() = events;
}
