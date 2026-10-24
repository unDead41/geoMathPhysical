#include "hardware/rfid.h"
#include "hardware/inputs.h"
#include "domain/registry.h"
#include "config.h"
#include <SPI.h>
#include <MFRC522.h>
#include <cstring>

// SPI dikongsi, SS berasingan. Hanya satu antena ON pada satu-satu masa.
namespace {
MFRC522 rfidReaders[READER_COUNT];
ReaderRecord rfidRecords[READER_COUNT] = {};
ScanMode rfidScanMode = ScanMode::STOPPED;
int8_t rfidLastReader = -1, rfidActiveReader = -1;
uint8_t rfidNextReader = 0;
uint32_t rfidLastPoll = 0, rfidFieldStarted = 0;

}

void rfidBegin() {
  rfidScanMode = ScanMode::STOPPED;
  rfidLastReader = rfidActiveReader = -1; rfidNextReader = 0;
  rfidLastPoll = rfidFieldStarted = millis();
  memset(rfidRecords, 0, sizeof(rfidRecords));
  for (uint8_t i = 0; i < READER_COUNT; ++i) {
    pinMode(RFID_SS_PINS[i], OUTPUT); digitalWrite(RFID_SS_PINS[i], HIGH);
  }
  pinMode(RFID_RST_PIN, OUTPUT); digitalWrite(RFID_RST_PIN, HIGH);
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, -1);
  for (uint8_t i = 0; i < READER_COUNT; ++i) {
    rfidReaders[i].PCD_Init(RFID_SS_PINS[i], RFID_RST_PIN);
    rfidRecords[i].version = rfidReaders[i].PCD_ReadRegister(MFRC522::VersionReg);
    rfidRecords[i].online = rfidRecords[i].version != 0 && rfidRecords[i].version != 0xFF;
    rfidReaders[i].PCD_AntennaOff();
    Serial.printf("[R%u] firmware=0x%02X %s\n", unsigned(i + 1), unsigned(rfidRecords[i].version),
                  rfidRecords[i].online ? "READY" : "NOT FOUND");
  }
}

bool rfidReaderEnabled(uint8_t reader) {
  if (reader >= 2 || !rfidRecords[reader].online) return false;
  return rfidScanMode == ScanMode::BOTH ||
         (rfidScanMode == ScanMode::R1 && reader == 0) ||
         (rfidScanMode == ScanMode::R2 && reader == 1);
}
void rfidCheckConnections() {
  rfidSetMode(ScanMode::STOPPED);
  for (uint8_t i = 0; i < READER_COUNT; ++i) {
    rfidRecords[i].version = rfidReaders[i].PCD_ReadRegister(MFRC522::VersionReg);
    rfidRecords[i].online = rfidRecords[i].version != 0 && rfidRecords[i].version != 0xFF;
  }
}

void rfidSetMode(ScanMode mode) {
  rfidScanMode = mode;
  rfidActiveReader = -1; rfidNextReader = 0; rfidLastReader = -1;
  rfidLastPoll = millis() - RFID_POLL_MS;
  for (uint8_t i = 0; i < 2; ++i) {
    rfidReaders[i].PCD_AntennaOff();
    rfidRecords[i].present = false;
    rfidRecords[i].misses = 0;
    rfidRecords[i].requireRemoval = false;
  }
}

void rfidRequireFreshCards() {
  for (uint8_t i = 0; i < 2; ++i) {
    rfidRecords[i].requireRemoval = rfidReaderEnabled(i);
    rfidRecords[i].misses = 0;
  }
}

bool rfidPadsArmed() {
  for (uint8_t i = 0; i < READER_COUNT; ++i)
    if (rfidReaderEnabled(i) && rfidRecords[i].requireRemoval) return false;
  return true;
}

void rfidUpdate() {
  if (rfidScanMode == ScanMode::STOPPED) return;
  const uint32_t now = millis();
  if (rfidActiveReader < 0) {
    if (uint32_t(now - rfidLastPoll) < RFID_POLL_MS) return;
    for (uint8_t tries = 0; tries < 2; ++tries) {
      const uint8_t i = rfidNextReader;
      rfidNextReader = (rfidNextReader + 1) % 2;
      if (!rfidReaderEnabled(i)) continue;
      rfidReaders[i].PCD_AntennaOn();
      rfidActiveReader = int8_t(i);
      rfidFieldStarted = now;
      return; // Tunggu medan RF stabil tanpa delay().
    }
    rfidLastPoll = now;
    return;
  }
  if (uint32_t(now - rfidFieldStarted) < RFID_FIELD_SETTLE_MS) return;
  const uint8_t i = uint8_t(rfidActiveReader);
  ReaderRecord &record = rfidRecords[i];
  uint8_t atqa[2] = {}, atqaSize = sizeof(atqa);
  const MFRC522::StatusCode status = rfidReaders[i].PICC_WakeupA(atqa, &atqaSize);
  bool dispatch = false;
  if (status == MFRC522::STATUS_OK || status == MFRC522::STATUS_COLLISION) {
    if (rfidReaders[i].PICC_ReadCardSerial()) {
      Uid next = {};
      next.size = rfidReaders[i].uid.size;
      if (uidValid(next)) {
        memcpy(next.bytes, rfidReaders[i].uid.uidByte, next.size);
        const bool changed = !record.present || !uidEqual(record.uid, next);
        record.uid = next; record.present = true; record.misses = 0;
        dispatch = changed && !record.requireRemoval &&
                   rfidPadsArmed();
      }
      rfidReaders[i].PICC_HaltA();
      rfidReaders[i].PCD_StopCrypto1();
    }
  } else if (status == MFRC522::STATUS_TIMEOUT) {
    // Beberapa bacaan kosong diperlukan supaya satu gangguan RF tidak terus
    // dianggap sebagai kad telah diangkat.
    if (record.misses < RFID_EMPTY_POLLS) ++record.misses;
    if (record.misses >= RFID_EMPTY_POLLS) {
      record.present = false;
      record.requireRemoval = false;
    }
  }
  rfidReaders[i].PCD_AntennaOff();
  rfidActiveReader = -1; rfidLastPoll = millis();
  if (dispatch) {
    ++record.count; rfidLastReader = int8_t(i);
    if (hardwareInputs().scan) hardwareInputs().scan(i, record.uid);
  }
}

const ReaderRecord &rfidGetRecord(uint8_t reader) { return rfidRecords[reader < 2 ? reader : 0]; }
int8_t rfidGetLastReader() { return rfidLastReader; }
ScanMode rfidGetMode() { return rfidScanMode; }

