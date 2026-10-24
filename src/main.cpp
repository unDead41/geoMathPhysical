// PlatformIO compiles one entry point. The original Arduino tabs remain the
// source of truth so fixes apply to VS Code and Arduino IDE together.
// Declare library dependencies here so PlatformIO can discover them while
// scanning src/. The shared Arduino tabs live outside that source directory.
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>
#include "../main/main.ino"
#include "../main/app.ino"
#include "../main/buttons.ino"
#include "../main/lcd_display.ino"
#include "../main/quiz.ino"
#include "../main/rfid.ino"
#include "../main/rgb_leds.ino"
#include "../main/serial_commands.ino"
#include "../main/tag_registry.ino"
