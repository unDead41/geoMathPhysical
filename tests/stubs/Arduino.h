#pragma once
#include <algorithm>
#include <array>
#include <cassert>
#include <cstdarg>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <deque>
#include <map>
#include <random>
#include <string>
#include <vector>
using byte = uint8_t;
using __FlashStringHelper = char;
#define F(s) s
constexpr int HIGH=1, LOW=0, INPUT=0, OUTPUT=1, INPUT_PULLUP=2, INPUT_PULLDOWN=3, HEX=16;
inline uint32_t clockMs=0;
inline std::array<int,64> pinLevels{};
inline std::array<int,64> pinModes{};
inline std::mt19937 rng(7);
inline uint32_t millis(){return clockMs;}
inline void yield(){}
inline uint32_t esp_random(){return rng();}
inline void randomSeed(uint32_t seed){rng.seed(seed);}
inline long random(long maximum){assert(maximum>0);return rng()%maximum;}
inline void pinMode(int pin,int mode){pinModes.at(pin)=mode;}
inline int digitalRead(int pin){return pinLevels.at(pin);}
inline void digitalWrite(int pin,int value){
  assert(pinModes.at(pin)==OUTPUT);pinLevels.at(pin)=value;
}
struct SerialStub {
  std::deque<char> input;
  std::string output;
  void begin(uint32_t baud){assert(baud==115200);}
  int available(){return int(input.size());}
  int read(){int c=input.front();input.pop_front();return c;}
  void print(const char *s){output+=s;}
  void print(char c){output+=c;}
  template<class T> void print(T n){output+=std::to_string(n);}
  template<class T> void print(T n,int){char b[32];snprintf(b,sizeof b,"%llX",(unsigned long long)n);output+=b;}
  void println(){output+='\n';}
  template<class T> void println(T value){print(value);println();}
  template<class T> void println(T value,int base){print(value,base);println();}
  void printf(const char *format,...){
    char b[2048];va_list ap;va_start(ap,format);
    int n=vsnprintf(b,sizeof b,format,ap);va_end(ap);
    assert(n>=0&&size_t(n)<sizeof b);output+=b;
  }
} inline Serial;
