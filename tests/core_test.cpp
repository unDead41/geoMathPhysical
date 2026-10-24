#include "../main/config.h"
#include <iostream>
#include <set>

int main(){
  uint8_t out[ROUND_TARGET]={};
  const auto n=bankBuildRound(0x03,out);
  if(n!=4){
    std::cerr<<"FAIL: cube + pyramid must produce a four-question round; got "<<int(n)<<"\n";
    return 1;
  }
  bool varied=false;
  std::vector<uint8_t> previous;
  for(unsigned seed=0;seed<100;++seed){
    randomSeed(seed);
    for(uint8_t mask:{uint8_t(3),uint8_t(7),ALL_SHAPES_MASK}){
      auto count=bankBuildRound(mask,out);
      assert(count==(mask==3?4:5));
      std::set<uint8_t> unique;
      unsigned perShape[SHAPE_COUNT]={};
      for(unsigned j=0;j<count;++j){
        assert(out[j]<QUESTION_COUNT);
        const auto type=uint8_t(QUESTIONS[out[j]].answer);
        assert(mask&(1U<<type));++perShape[type];
        assert(unique.insert(out[j]).second);
      }
      for(unsigned c:perShape)assert(c<=2);
      if(mask==3)assert(perShape[0]==2&&perShape[1]==2);
      std::vector<uint8_t> current(out,out+count);
      if(!previous.empty()&&mask==3&&current!=previous)varied=true;
      if(mask==3)previous=current;
    }
  }
  assert(varied);
  assert(bankBuildRound(0,out)==0);
  for(const auto &q:QUESTIONS){
    assert(strlen(q.prompt)<=20&&strlen(q.detail)<=20&&strlen(q.hint)<=20);
  }
  std::cout<<"PASS: bank selection, active-type limits, no repeats, variation and LCD limits.\n";
}
