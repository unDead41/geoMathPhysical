#pragma once
#include <cstdint>
struct FakeWire {bool begin(uint8_t,uint8_t,uint32_t){return true;}void setTimeOut(int){}};
extern FakeWire Wire;
