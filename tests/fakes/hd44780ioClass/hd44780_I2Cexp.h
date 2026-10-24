#pragma once
#include <cstring>
namespace sim { extern char lcdCells[4][21]; }
class hd44780_I2Cexp {
 unsigned col=0,row=0;
 public:
 char (&cells)[4][21]=sim::lcdCells;
 int begin(int,int){for(auto& line:cells){memset(line,' ',20);line[20]=0;}return 0;}
 void backlight(){} void noCursor(){} void noBlink(){}
 void setCursor(unsigned c,unsigned r){col=c;row=r;}
 void print(const char* s){while(*s&&row<4&&col<20)cells[row][col++]=*s++;}
};

