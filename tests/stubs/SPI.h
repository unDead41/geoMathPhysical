#pragma once
#include <Arduino.h>
struct SPIStub {
  void begin(int sck,int miso,int mosi,int ss){
    assert(sck==18&&miso==19&&mosi==23&&ss==-1);
  }
} inline SPI;
