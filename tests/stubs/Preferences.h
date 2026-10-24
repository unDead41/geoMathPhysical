#pragma once
#include <Arduino.h>
class Preferences {
  std::string prefix;
public:
  inline static std::map<std::string,std::vector<uint8_t>> disk;
  inline static bool failWrites=false, failOpen=false;
  bool begin(const char *name,bool=false){prefix=std::string(name)+"/";return !failOpen;}
  size_t getBytesLength(const char *key){auto it=disk.find(prefix+key);return it==disk.end()?0:it->second.size();}
  size_t getBytes(const char *key,void *out,size_t cap){
    auto it=disk.find(prefix+key);if(it==disk.end())return 0;
    size_t n=std::min(cap,it->second.size());memcpy(out,it->second.data(),n);return n;
  }
  size_t putBytes(const char *key,const void *data,size_t count){
    if(failWrites)return 0;
    auto p=static_cast<const uint8_t*>(data);disk[prefix+key]={p,p+count};return count;
  }
};
