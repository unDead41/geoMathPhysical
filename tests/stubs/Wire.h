#pragma once
#include <Arduino.h>
struct WireStub {
  bool ready=true;
  bool begin(int sda,int scl,uint32_t hz){assert(sda==21&&scl==22&&hz==100000);return ready;}
  void setTimeOut(unsigned ms){assert(ms==25);}
} inline Wire;
