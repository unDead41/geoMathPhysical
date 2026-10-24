#pragma once
#include <map>
#include <vector>
#include <string>
#include <cstring>
extern std::map<std::string,std::vector<uint8_t>> fakeNvs;
class Preferences {
 std::string ns;
 public:
 bool begin(const char* name,bool){ns=name;return true;}
 size_t getBytesLength(const char* key){return fakeNvs[ns+'/'+key].size();}
 size_t getBytes(const char* key,void* out,size_t n){const auto& b=fakeNvs[ns+'/'+key];size_t s=std::min(n,b.size());if(s)memcpy(out,b.data(),s);return s;}
 size_t putBytes(const char* key,const void* data,size_t n){const uint8_t* p=static_cast<const uint8_t*>(data);fakeNvs[ns+'/'+key]=std::vector<uint8_t>(p,p+n);return n;}
};
