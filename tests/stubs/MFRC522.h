#pragma once
#include <Arduino.h>
struct MFRC522 {
  enum PCD_Register {VersionReg=0x37};
  enum StatusCode {STATUS_OK, STATUS_ERROR, STATUS_COLLISION, STATUS_TIMEOUT};
  struct UidData {uint8_t size=0;uint8_t uidByte[10]={};} uid;
  struct Card {bool present=false;UidData uid;};
  static Card cards[2];
  inline static uint8_t firmware[2]={0x92,0x92};
  inline static uint32_t reads[2]={0,0};
  bool antenna=false;
  uint8_t index=0;
  void PCD_Init(uint8_t ss,uint8_t rst){assert(rst==4);assert(ss==5||ss==27);index=ss==5?0:1;}
  uint8_t PCD_ReadRegister(PCD_Register){return firmware[index];}
  void PCD_AntennaOn(){antenna=true;}
  void PCD_AntennaOff(){antenna=false;}
  StatusCode PICC_WakeupA(uint8_t *atqa,uint8_t *size){
    assert(*size==2);atqa[0]=4;atqa[1]=0;
    return antenna&&cards[index].present?STATUS_OK:STATUS_TIMEOUT;
  }
  bool PICC_ReadCardSerial(){
    if(!antenna||!cards[index].present)return false;
    uid=cards[index].uid;++reads[index];return true;
  }
  StatusCode PICC_HaltA(){return STATUS_OK;}
  void PCD_StopCrypto1(){}
};
inline MFRC522::Card MFRC522::cards[2];
