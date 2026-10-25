#pragma once
#include <Arduino.h>
#include "domain/rules.h"

#if !defined(ARDUINO_ARCH_ESP32) || !defined(CONFIG_IDF_TARGET_ESP32)
#error "Pilih ESP32 Dev Module klasik/WROOM-32, bukan UNO, C3 atau S3."
#endif

// Board/electrical configuration only. No application state or module declarations.
// Semua nombor pin ialah GPIO, bukan kedudukan fizikal pada header.
constexpr uint32_t SERIAL_BAUD = 115200;
// Ikut gambar wiring pengguna: R1 SS=5, R2 SS=27, RST bersama=4.
constexpr uint8_t RFID_SS_PINS[2] = {5, 27};
constexpr uint8_t RFID_RST_PIN = 4;
constexpr uint8_t RFID_SCK_PIN = 18, RFID_MISO_PIN = 19, RFID_MOSI_PIN = 23;
constexpr uint16_t RFID_POLL_MS = 35, RFID_FIELD_SETTLE_MS = 6;
constexpr uint8_t RFID_EMPTY_POLLS = 3;
constexpr uint8_t LCD_SDA_PIN = 21, LCD_SCL_PIN = 22;
constexpr uint8_t LCD_COLUMNS = 20, LCD_ROWS = 4;
constexpr uint32_t LCD_I2C_CLOCK_HZ = 100000;
constexpr uint8_t BUTTON_PINS[2] = {32, 33};
// GPIO32/33 menyokong bias dalaman; buttonsBegin() ikut polariti modul.
constexpr uint8_t BUTTON_PRESSED_LEVEL[2] = {LOW, LOW};
constexpr uint16_t BUTTON_DEBOUNCE_MS = 40;
// LED biasa kekal pada pin asal, berasingan daripada pemasangan RGB pengguna.
constexpr uint8_t LED_PINS[2] = {25, 26}; // R1=bongkah, R2=bentangan.
// Susunan array: R/G/B. Kedudukan LED R1/R2 ditukar mengikut pemasangan pengguna.
// RGB1/R1: B=25, G=14, R=13. RGB2/R2: B=26, G=17, R=16.
constexpr uint8_t RGB_PINS[2][3] = {{13, 14, 25}, {16, 17, 26}};
#ifndef GEODECODER_RGB_ENABLED
// 0 = dua LED biasa GPIO25/26; 1 = dua RGB mengikut jadual pin di atas.
#define GEODECODER_RGB_ENABLED 0
#endif
constexpr bool RGB_ENABLED = GEODECODER_RGB_ENABLED != 0;
constexpr bool RGB_COMMON_ANODE = false; // Common pin ke GND; jika true ke 3V3.
constexpr uint16_t COMMAND_BUFFER_SIZE = 160;

