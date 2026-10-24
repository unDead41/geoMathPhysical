#include <iostream>
#include <stdexcept>
#include <functional>
#if __has_include("../main/main.ino")
#include "../main/main.ino"
#include "../main/app.ino"
#include "../main/buttons.ino"
#include "../main/lcd_display.ino"
#include "../main/quiz.ino"
#include "../main/rfid.ino"
#include "../main/rgb_leds.ino"
#include "../main/serial_commands.ino"
#include "../main/tag_registry.ino"

#define CHECK(x) do{if(!(x))throw std::runtime_error(std::string(#x)+" line "+std::to_string(__LINE__));}while(0)
void advance(uint32_t ms){
  for(uint32_t n=0;n<ms;++n){++clockMs;loop();}
}
void fresh(bool erase=true){
  clockMs=0;pinLevels.fill(HIGH);pinModes.fill(-1);
  Serial.input.clear();Serial.output.clear();randomSeed(17);
  if(erase)Preferences::disk.clear();
  Preferences::failOpen=false;Preferences::failWrites=false;
  MFRC522::firmware[0]=MFRC522::firmware[1]=0x92;
  for(auto &c:MFRC522::cards)c={};
  Wire.ready=true;hd44780_I2Cexp::initResult=0;
  setup();advance(250);
}
Uid card(Shape shape,uint8_t role){
  char text[20];snprintf(text,sizeof text,"00 11 %02X %02X",unsigned(uint8_t(shape)+1),unsigned(role+1));
  Uid u={};CHECK(uidParse(text,u));return u;
}
void registerTypes(uint8_t count){
  for(uint8_t shape=0;shape<count;++shape)
    for(uint8_t role=0;role<2;++role)CHECK(registryAssign(role,Shape(shape),card(Shape(shape),role)));
}
void playDefault(){
  registerTypes(3);CHECK(appPlay(true));advance(250);
}
void command(const std::string &text){
  for(char c:text)Serial.input.push_back(c);
  Serial.input.push_back('\n');
  while(Serial.available())advance(1);
}
void place(uint8_t reader,const Uid &uid){
  auto &c=MFRC522::cards[reader];c.present=true;c.uid.size=uid.size;
  memcpy(c.uid.uidByte,uid.bytes,uid.size);
}
void removeCards(){for(auto &c:MFRC522::cards)c.present=false;}
void answer(Shape shape){
  appHandleScan(0,card(shape,0));appHandleScan(1,card(shape,1));
}
void pressButton(uint8_t button){
  pinLevels[BUTTON_PINS[button]]=LOW;advance(50);
  pinLevels[BUTTON_PINS[button]]=HIGH;advance(50);
}
int main(){
  unsigned passed=0;
  auto test=[&](const char *name,const std::function<void()> &fn){
    try{fresh();fn();++passed;std::cout<<"PASS "<<name<<"\n";}
    catch(const std::exception &e){std::cerr<<"FAIL "<<name<<": "<<e.what()<<"\n";std::exit(1);}
  };
  test("round clock includes hints, pauses in menu and freezes at the last answer",[]{
    playDefault();advance(2100);lcdUpdate();
    CHECK(lcd.rows[3].find("00:02")!=std::string::npos);
    pressButton(1);advance(1000);lcdUpdate();
    CHECK(lcd.rows[3].find("00:03")!=std::string::npos);
    command("stop");advance(5000);Serial.output.clear();command("score");
    CHECK(Serial.output.find("masa=00:03")!=std::string::npos);
    pressButton(0);advance(1000);lcdUpdate();
    CHECK(lcd.rows[3].find("00:04")!=std::string::npos);
    while(quiz.index+1<quiz.length)quizNext();
    answer(quizCurrentQuestion()->answer);lcdUpdate();const auto finished=lcd.rows[3];
    advance(3000);lcdUpdate();CHECK(lcd.rows[3]==finished);
    quizNext();lcdUpdate();CHECK(quiz.phase==QuizPhase::SUMMARY);
    CHECK(lcd.rows[1].find("1/5")!=std::string::npos);
    CHECK(lcd.rows[2].find("00:04")!=std::string::npos);
    const auto duration=lcd.rows[2];advance(5000);lcdUpdate();CHECK(lcd.rows[2]==duration);
    pressButton(0);CHECK(quiz.score==0&&lcd.rows[3].find("00:00")!=std::string::npos);
  });
  test("round clock survives millis rollover and reports time when the last question is skipped",[]{
    registerTypes(3);clockMs=UINT32_MAX-500;CHECK(appPlay(true));
    advance(1500);lcdUpdate();CHECK(lcd.rows[3].find("00:01")!=std::string::npos);
    while(quiz.phase==QuizPhase::QUESTION)quizNext();
    lcdUpdate();
    CHECK(lcd.rows[1].find("0/5")!=std::string::npos);
    CHECK(lcd.rows[2].find("00:01")!=std::string::npos);
    const auto duration=lcd.rows[2];advance(3000);lcdUpdate();CHECK(lcd.rows[2]==duration);
  });
  test("physical buttons start from menu, show help and replay a complete round",[]{
    registerTypes(3);const auto saved=Preferences::disk;fresh(false);
    CHECK(appMode==AppMode::STOPPED&&quiz.phase==QuizPhase::SETUP);
    CHECK(Preferences::disk==saved);lcdUpdate();
    CHECK(lcd.rows[0].find("GeoDecoder")!=std::string::npos);
    CHECK(lcd.rows[2].find("NEXT")!=std::string::npos);
    pressButton(1);CHECK(appMode==AppMode::STOPPED&&quiz.hintsUsed==0);
    CHECK(lcd.rows[0].find("CARA BERMAIN")!=std::string::npos);
    pressButton(1);CHECK(lcd.rows[0].find("GeoDecoder")!=std::string::npos);
    pressButton(0);advance(400);
    CHECK(appMode==AppMode::PLAY&&quiz.index==0&&quiz.length==5&&quiz.score==0);
    const auto question=lcd.rows[0];pressButton(1);
    CHECK(quiz.hintsUsed==1&&lcd.rows[0]==question);
    for(unsigned n=0;n<5;++n){
      removeCards();advance(400);const Shape target=quizCurrentQuestion()->answer;
      place(0,card(target,0));place(1,card(target,1));advance(400);
      CHECK(quiz.awarded);pressButton(0);
    }
    CHECK(quiz.phase==QuizPhase::SUMMARY&&quiz.score==5);
    pressButton(1);CHECK(appMode==AppMode::STOPPED&&quiz.score==5);
    CHECK(lcd.rows[0].find("GeoDecoder")!=std::string::npos);
    pressButton(0);CHECK(appMode==AppMode::PLAY&&quiz.index==0&&quiz.score==0);
    CHECK(Preferences::disk==saved);
  });
  test("physical start cannot bypass incomplete cards or an offline reader",[]{
    pressButton(0);CHECK(appMode==AppMode::STOPPED&&quiz.phase==QuizPhase::SETUP);
    registerTypes(3);MFRC522::firmware[1]=0;rfidBegin();pressButton(0);
    CHECK(appMode==AppMode::STOPPED&&quiz.phase==QuizPhase::SETUP);
    for(const auto &row:lcd.rows){
      CHECK(row.find("Serial:")==std::string::npos&&row.find("GPIO")==std::string::npos);
      CHECK(row.find("UID")==std::string::npos);
    }
  });
  test("physical NEXT cancels teacher capture and returns from UID inspection",[]{
    CHECK(appEnroll(0,Shape::CUBE));pressButton(0);
    CHECK(appMode==AppMode::STOPPED);
    place(0,card(Shape::CUBE,0));advance(300);
    CHECK(!registryReady(Shape::CUBE));removeCards();registerTypes(3);
    appInspect(ScanMode::R1);pressButton(0);CHECK(appMode==AppMode::STOPPED);
    pressButton(0);CHECK(appMode==AppMode::PLAY&&quiz.index==0);
  });
  test("default three types require six real registered tags",[]{
    CHECK(registryData.activeMask==7);CHECK(maskCount(registryData.activeMask)==3);
    CHECK(!appPlay(true));registerTypes(2);CHECK(!appPlay(true));
    registerTypes(3);CHECK(appPlay(true));CHECK(quiz.length==5);
  });
  test("UID parsing preserves leading zero; rejects invalid sizes and bytes",[]{
    Uid u={},v={};
    CHECK(uidParse("00:01:02:03",u));CHECK(u.size==4&&u.bytes[0]==0);
    CHECK(uidParse("00010203",v)&&uidEqual(u,v));
    CHECK(uidParse("01 02 03 04 05 06 07",u)&&u.size==7);
    CHECK(uidParse("00-01-02-03-04-05-06-07-08-09",u)&&u.size==10);
    CHECK(!uidParse("01 02 03",u));CHECK(!uidParse("GG 01 02 03",u));
    CHECK(!uidParse("0102030405060708090",u));CHECK(!uidParse("0102030405060708091011",u));
  });
  test("duplicate UID rejection and failed persistent write leave RAM unchanged",[]{
    Uid u=card(Shape::CUBE,0);CHECK(registryAssign(0,Shape::CUBE,u));
    CHECK(!registryAssign(1,Shape::CUBE,u));
    RegistryData before=registryData;Preferences::failWrites=true;
    CHECK(!registryAssign(0,Shape::PYRAMID,card(Shape::PYRAMID,0)));
    CHECK(memcmp(&before,&registryData,sizeof before)==0);
  });
  test("persistent tags and active types survive reboot",[]{
    registerTypes(3);CHECK(registrySetActive(3));fresh(false);
    CHECK(registryData.activeMask==3&&registryReady(Shape::CUBE)&&registryReady(Shape::PYRAMID));
    CHECK(Preferences::disk.count("geomath_q2/registry")==1);
    CHECK(appMode==AppMode::STOPPED&&quiz.phase==QuizPhase::SETUP);
    pressButton(0);CHECK(appMode==AppMode::PLAY&&quiz.length==4&&quiz.score==0);
  });
  test("NVS open failure cannot report even a no-op edit as saved",[]{
    Preferences::failOpen=true;registryBegin();CHECK(!registryStorageReady);
    Serial.output.clear();
    CHECK(!registryUnassign(0,Shape::CUBE));
    CHECK(Serial.output.find("[SAVED]")==std::string::npos);
    CHECK(!registryAssign(0,Shape::CUBE,card(Shape::CUBE,0)));
  });
  test("invalid stored size version UID length and duplicate tags are rejected",[]{
    for(unsigned defect=0;defect<5;++defect){
      fresh();registerTypes(3);RegistryData bad=registryData;
      if(defect==0)++bad.version;
      if(defect==1)bad.tags[0][0].size=5;
      if(defect==2)bad.tags[1][1]=bad.tags[0][0];
      if(defect==3)bad.activeMask=0;
      for(auto &kv:Preferences::disk){
        const auto *p=reinterpret_cast<const uint8_t*>(&bad);
        kv.second.assign(p,p+sizeof bad);
        if(defect==4)kv.second.resize(7);
      }
      fresh(false);CHECK(registryData.activeMask==7);
      CHECK(!registryReady(Shape::CUBE)&&appMode==AppMode::STOPPED);
    }
  });
  test("invalid stored registry is rejected safely",[]{
    registerTypes(3);for(auto &kv:Preferences::disk)kv.second[0]^=0xff;
    fresh(false);CHECK(registryData.activeMask==7);CHECK(!registryReady(Shape::CUBE));
    CHECK(appMode==AppMode::STOPPED);
  });
  test("one pad waits; correct pair awards once",[]{
    playDefault();Shape target=quizCurrentQuestion()->answer;
    appHandleScan(0,card(target,0));CHECK(quiz.score==0&&quiz.feedback==Feedback::WAITING);
    appHandleScan(1,card(target,1));CHECK(quiz.score==1&&quiz.awarded);
    answer(target);answer(target);CHECK(quiz.score==1);
  });
  test("matching pair of wrong shape is still wrong; retry can earn one point",[]{
    playDefault();Shape target=quizCurrentQuestion()->answer;
    Shape other=target==Shape::CUBE?Shape::PYRAMID:Shape::CUBE;
    answer(other);CHECK(quiz.score==0&&quiz.feedback==Feedback::WRONG&&quiz.wrongAttempts==1);
    answer(other);CHECK(quiz.wrongAttempts==1);
    answer(target);CHECK(quiz.score==1&&quiz.awarded);
  });
  test("unknown and wrong-pad cards invalidate old answer",[]{
    playDefault();Shape target=quizCurrentQuestion()->answer;
    appHandleScan(0,card(target,0));
    Uid unknown={};CHECK(uidParse("FA FB FC FD",unknown));appHandleScan(0,unknown);
    CHECK(!quiz.received[0]&&quiz.feedback==Feedback::UNKNOWN_UID);
    appHandleScan(1,card(target,1));CHECK(quiz.score==0);
    appHandleScan(0,card(target,1));CHECK(!quiz.received[0]&&quiz.feedback==Feedback::WRONG_PAD);
    appHandleScan(0,card(target,0));CHECK(quiz.score==1);
  });
  test("B2 preserves question line and counts each hinted question once",[]{
    playDefault();lcdUpdate();auto line=lcd.rows[0];
    quizHint();lcdUpdate();CHECK(lcd.rows[0]==line&&lcd.rows[1].find("HINT:")==0);
    quizHint();CHECK(quiz.hintsUsed==1&&quizColor()==RgbColor::BLUE);
  });
  test("next clears answers, skips with zero and reaches round summary",[]{
    playDefault();appHandleScan(0,card(quizCurrentQuestion()->answer,0));quizHint();
    quizNext();CHECK(quiz.index==1&&!quiz.received[0]&&!quiz.received[1]&&!quiz.showHint);
    CHECK(quiz.score==0);while(quiz.phase==QuizPhase::QUESTION)quizNext();
    CHECK(quiz.phase==QuizPhase::SUMMARY&&quiz.score==0);
    quizNext();CHECK(quiz.phase==QuizPhase::QUESTION&&quiz.index==0&&quiz.length==5);
  });
  test("serial parser handles case CRLF, partial input and rejects overflow atomically",[]{
    registerTypes(5);command("  UsE   KUBUS  PIRAMID \r");CHECK(registryData.activeMask==3);
    command("set bongkah 3 extra");CHECK(registryData.activeMask==3);
    for(char c:std::string("use kubus"))Serial.input.push_back(c);
    advance(10);CHECK(registryData.activeMask==3);
    Serial.input.push_back('\n');advance(10);CHECK(registryData.activeMask==1);
    command("use kubus piramid "+std::string(180,'x'));CHECK(registryData.activeMask==1);
    command("set bongkah 3");CHECK(registryData.activeMask==7);
    Serial.output.clear();command("help");
    CHECK(Serial.output.find("assign")!=std::string::npos&&Serial.output.find("current kubus")!=std::string::npos);
  });
  test("set count fails without partial changes when pairs are missing",[]{
    registerTypes(3);CHECK(!registrySetCount(5));CHECK(registryData.activeMask==7);
    CHECK(registrySetCount(2)&&registryData.activeMask==3);
    CHECK(!registrySetActive(0)&&registryData.activeMask==3);
  });
  test("UID scan pauses grading; enrollment captures only requested reader and stops",[]{
    playDefault();Shape target=quizCurrentQuestion()->answer;
    appInspect(ScanMode::BOTH);answer(target);CHECK(quiz.score==0);
    CHECK(appEnroll(0,Shape::CONE));
    appHandleScan(1,card(Shape::CONE,0));CHECK(appMode==AppMode::ENROLL);
    appHandleScan(0,card(Shape::CONE,0));CHECK(appMode==AppMode::STOPPED);
    uint8_t reader=255;CHECK(registryLookup(card(Shape::CONE,0),reader)==Shape::CONE&&reader==0);
    CHECK(quiz.phase==QuizPhase::SETUP);
  });
  test("enrollment timeout is nonblocking and leaves registry unchanged",[]{
    RegistryData before=registryData;CHECK(appEnroll(0,Shape::CUBE));
    advance(ENROLL_TIMEOUT_MS+1);CHECK(appMode==AppMode::STOPPED);
    CHECK(memcmp(&before,&registryData,sizeof before)==0);
  });
  test("scan-to-enroll all six actual cards enables default play",[]{
    for(uint8_t s=0;s<3;++s)for(uint8_t r=0;r<2;++r){
      CHECK(appEnroll(r,Shape(s)));place(r,card(Shape(s),r));advance(250);
      CHECK(appMode==AppMode::STOPPED);removeCards();advance(150);
    }
    CHECK(registryActiveReady()&&appPlay(true));
  });
  test("held tags cannot answer a new question until removed and re-tapped",[]{
    playDefault();Shape target=quizCurrentQuestion()->answer;
    place(0,card(target,0));place(1,card(target,1));advance(400);
    CHECK(quiz.score==1&&quiz.awarded);advance(400);CHECK(quiz.score==1);
    quizNext();advance(400);CHECK(quiz.score==1&&!quiz.awarded&&!rfidPadsArmed());
    removeCards();advance(400);CHECK(rfidPadsArmed());
    target=quizCurrentQuestion()->answer;place(0,card(target,0));place(1,card(target,1));advance(400);
    CHECK(quiz.score==2&&quiz.awarded);
  });
  test("reader-specific UID scan keeps records independent",[]{
    appInspect(ScanMode::R1);place(0,card(Shape::CUBE,0));place(1,card(Shape::PYRAMID,1));
    advance(300);CHECK(rfidGetRecord(0).count==1&&rfidGetRecord(1).count==0);
    appInspect(ScanMode::R2);advance(300);
    CHECK(rfidGetRecord(0).count==1&&rfidGetRecord(1).count==1);
  });
  test("held cards through UID inspection cannot answer on play resume",[]{
    playDefault();Shape target=quizCurrentQuestion()->answer;
    place(0,card(target,0));place(1,card(target,1));advance(400);CHECK(quiz.score==1);
    quizNext();appInspect(ScanMode::BOTH);advance(400);CHECK(quiz.score==1);
    CHECK(appPlay(false));advance(400);CHECK(quiz.score==1&&!quiz.awarded);
    removeCards();advance(400);target=quizCurrentQuestion()->answer;
    place(0,card(target,0));place(1,card(target,1));advance(400);CHECK(quiz.score==2);
  });
  test("button acts while held after debounce and never repeats; rollover safe",[]{
    playDefault();pinLevels[BUTTON_PINS[0]]=LOW;advance(20);CHECK(quiz.index==0);
    advance(25);CHECK(quiz.index==1);advance(1000);CHECK(quiz.index==1);
    pinLevels[BUTTON_PINS[0]]=HIGH;advance(60);
    clockMs=UINT32_MAX-20;pinLevels[BUTTON_PINS[0]]=LOW;advance(60);CHECK(quiz.index==2);
    pinLevels[BUTTON_PINS[1]]=LOW;advance(60);CHECK(quiz.hintsUsed==1);
    advance(1000);CHECK(quiz.hintsUsed==1);
    CHECK(pinModes[32]==INPUT_PULLUP&&pinModes[33]==INPUT_PULLUP);
  });
  test("RGB disabled leaves reserved pins alone; enabled shows global quiz colors",[]{
    if(!RGB_ENABLED){for(auto &p:RGB_PINS)for(auto pin:p)CHECK(pinModes[pin]==-1);}
    else{
      playDefault();rgbUpdate();
      for(auto &p:RGB_PINS){CHECK(pinModes[p[0]]==OUTPUT);CHECK(pinLevels[p[2]]==HIGH);}
      Shape target=quizCurrentQuestion()->answer;
      answer(target==Shape::CUBE?Shape::PYRAMID:Shape::CUBE);rgbUpdate();
      for(auto &p:RGB_PINS)CHECK(pinLevels[p[0]]==HIGH&&pinLevels[p[1]]==LOW);
      answer(target);rgbUpdate();
      for(auto &p:RGB_PINS)CHECK(pinLevels[p[1]]==HIGH&&pinLevels[p[0]]==LOW);
    }
  });
  test("LCD failure and offline reader leave Serial available",[]{
    hd44780_I2Cexp::initResult=1;lcdBegin();CHECK(!lcdIsReady());
    Serial.output.clear();command("help");CHECK(Serial.output.find("COMMAND")!=std::string::npos);
    MFRC522::firmware[1]=0;rfidBegin();registerTypes(3);CHECK(!appPlay(true));
  });
  test("teacher sees full UID in Serial while LCD stays learner friendly",[]{
    Uid u={};CHECK(uidParse("00 01 02 03 04 05 06 07 08 09",u));
    appInspect(ScanMode::R1);place(0,u);advance(250);lcdUpdate();
    CHECK(lcd.rows[0].find("GeoDecoder")!=std::string::npos);
    CHECK(lcd.rows[1].find("Kad berjaya dibaca")!=std::string::npos);
    for(const auto &row:lcd.rows){
      CHECK(row.find("00010203040506070809")==std::string::npos);
      CHECK(row.find("Serial:")==std::string::npos&&row.find("byte")==std::string::npos);
    }
    CHECK(Serial.output.find("00 01 02 03 04 05 06 07 08 09")!=std::string::npos);
  });
  std::cout<<passed<<" integration cases passed; RGB="<<RGB_ENABLED<<"\n";
}
#else
int main(){
  std::cerr<<"FAIL: quiz cannot accept the six RFID cards yet; application tabs are not implemented.\n";
  return 1;
}
#endif
