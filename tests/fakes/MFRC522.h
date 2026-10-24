#pragma once
#include <cstdint>
#include <cstring>
namespace sim {
 struct Card {bool present;uint8_t size;uint8_t bytes[10];};
 extern Card cards[2];
 extern uint8_t versions[2];
}
class MFRC522 {
 uint8_t reader=0;
 public:
 struct {uint8_t size=0;uint8_t uidByte[10]={};} uid;
 enum PCD_Register {VersionReg};
 enum StatusCode {STATUS_OK,STATUS_COLLISION,STATUS_TIMEOUT};
 void PCD_Init(uint8_t ss,uint8_t){reader=ss==5?0:1;}
 uint8_t PCD_ReadRegister(PCD_Register){return sim::versions[reader];}
 void PCD_AntennaOff(){}
 void PCD_AntennaOn(){}
 StatusCode PICC_WakeupA(uint8_t*,uint8_t*){return sim::cards[reader].present?STATUS_OK:STATUS_TIMEOUT;}
 bool PICC_ReadCardSerial(){const auto& c=sim::cards[reader];uid.size=c.size;memcpy(uid.uidByte,c.bytes,10);return c.present;}
 void PICC_HaltA(){}
 void PCD_StopCrypto1(){}
};
