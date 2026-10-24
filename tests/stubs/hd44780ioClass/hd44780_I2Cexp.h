#pragma once
#include <Arduino.h>
struct hd44780_I2Cexp {
  inline static int initResult=0;
  std::string rows[4]={std::string(20,' '),std::string(20,' '),std::string(20,' '),std::string(20,' ')};
  int row=0;
  int begin(int cols,int count){assert(cols==20&&count==4);return initResult;}
  void backlight(){} void noCursor(){} void noBlink(){}
  void setCursor(int col,int r){assert(col==0&&r<4);row=r;}
  void print(const char *s){assert(strlen(s)==20);rows[row]=s;}
};
