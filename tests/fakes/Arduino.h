#pragma once
#include <cstdint>
#include <cstddef>
#include <cstdio>
#include <cstdarg>
#include <cstring>
#include <string>
#include <array>
#include <deque>
#include <algorithm>
using byte=uint8_t;
constexpr uint8_t LOW=0,HIGH=1,OUTPUT=1,INPUT_PULLUP=2,INPUT_PULLDOWN=3;
#define F(x) x
namespace sim { extern uint32_t now, rng; extern std::array<int,64> pins; }
inline uint32_t millis(){return sim::now;}
inline void yield(){}
inline void pinMode(uint8_t pin,uint8_t mode){if(mode==INPUT_PULLUP)sim::pins[pin]=HIGH;else if(mode==INPUT_PULLDOWN)sim::pins[pin]=LOW;}
inline int digitalRead(uint8_t pin){return sim::pins[pin];}
inline void digitalWrite(uint8_t pin,uint8_t value){sim::pins[pin]=value;}
inline long random(long limit){sim::rng=1664525U*sim::rng+1013904223U;return limit>0?long(sim::rng%uint32_t(limit)):0;}
class FakeSerial {
 public:
  std::string output; std::deque<char> input;
  void begin(uint32_t){}
  int available()const{return int(input.size());}
  int read(){int c=input.front();input.pop_front();return c;}
  void println(const char* s){output+=s;output+='\n';}
  void printf(const char* fmt,...){char b[2048];va_list a;va_start(a,fmt);vsnprintf(b,sizeof(b),fmt,a);va_end(a);output+=b;}
};
extern FakeSerial Serial;
