// Executes the actual .ino tabs; only electrical/device I/O is simulated.
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <iostream>
#include <stdexcept>
#include <set>

namespace sim {uint32_t now=0,rng=7;std::array<int,64> pins={};Card cards[2]={};char lcdCells[4][21]={};bool nvsAvailable=true,nvsWriteOk=true,nvsShortWrite=false;}
FakeSerial Serial;
FakeSPI SPI;
FakeWire Wire;
std::map<std::string,std::vector<uint8_t>> fakeNvs;

#ifdef GEODECODER_SEPARATE_MODULES
#include "config.h"
#include "application/runtime.h"
#include "application/app.h"
#include "application/quiz.h"
#include "application/registry.h"
#include "hardware/rfid.h"
#include "hardware/buttons.h"
#include "hardware/lcd.h"
#include "presentation/serial_commands.h"
#include "question_bank.h"
#elif defined(GEODECODER_ENTRYPOINT)
#include GEODECODER_ENTRYPOINT
#else
#include "main.ino"
#include "app_ports.ino"
#include "nvs_storage.ino"
#include "app.ino"
#include "buttons.ino"
#include "lcd_display.ino"
#include "quiz.ino"
#include "rfid.ino"
#include "rgb_leds.ino"
#include "serial_commands.ino"
#include "tag_registry.ino"
#endif
#include "expected_displays.h"

// Legacy characterization fixtures set synthetic states only in test utilities.
// Production adapters see const snapshots and cannot mutate the application.
static QuizData &testQuiz(){return const_cast<QuizData &>(quizState());}
static RegistryData &testRegistry(){return const_cast<RegistryData &>(registryState());}

static void need(bool value,const char* message){if(!value)throw std::runtime_error(message);}
static void advance(uint32_t duration){for(uint32_t i=0;i<duration;++i){++sim::now;loop();}}
static void command(const char* text){char copy[200];strncpy(copy,text,sizeof(copy));copy[sizeof(copy)-1]=0;serialExecute(copy);}
static void fixture(){
 sim::nvsAvailable=true;sim::nvsWriteOk=true;sim::nvsShortWrite=false;sim::now=0;sim::rng=7;sim::pins.fill(LOW);memset(sim::cards,0,sizeof(sim::cards));fakeNvs.clear();Serial.output.clear();
 setup();
 for(uint8_t s=0;s<SHAPE_COUNT;++s)for(uint8_t r=0;r<2;++r){Uid uid={4,{0x04,uint8_t(s+1),uint8_t(r+1),0xA5}};need(registryAssign(r,Shape(s),uid),"test enrol failed");}
 need(registrySetActive(ALL_SHAPES_MASK),"test active set failed");
 appConfigurationChanged();lcdUpdate();
}
static uint8_t questionId(const char* id){for(uint8_t i=0;i<QUESTION_COUNT;++i)if(!strcmp(QUESTIONS[i].id,id))return i;throw std::runtime_error("question ID missing");}
static void start(){need(appPlay(true),"round did not start");advance(500);}
static void select(const char* id){testQuiz().order[testQuiz().index]=questionId(id);appInspect(ScanMode::BOTH);need(appPlay(false),"resume failed");advance(500);}
static const Uid& tag(Shape shape,uint8_t reader){return testRegistry().tags[uint8_t(shape)][reader];}

static void bank(){
 fixture();need(QUESTION_COUNT==15,"bank must contain 15 questions");
 unsigned counts[SHAPE_COUNT]={};std::set<unsigned> seen;
 for(const auto& q:QUESTIONS)++counts[uint8_t(q.answer)];
 for(auto n:counts)need(n==3,"each shape must have 3 questions");
 for(int round=0;round<100;++round){uint8_t out[ROUND_TARGET]={};need(bankBuildRound(ALL_SHAPES_MASK,out)==5,"all-shape round must have 5 questions");std::set<unsigned> ids,shapes;
  for(auto i:out){need(i<QUESTION_COUNT,"bank index out of bounds");ids.insert(i);shapes.insert(uint8_t(QUESTIONS[i].answer));seen.insert(i);}
  need(ids.size()==5,"repeated question in round");need(shapes.size()==5,"all-shape round should cover all 5 shapes");}
 need(seen.size()==15,"some bank questions cannot be selected");
}
static void menu(){fixture();need(std::string(sim::lcdCells[1]).find("Jom uji minda 3D!")!=std::string::npos,"menu copy does not match preview");}
static void help_pages(){fixture();for(unsigned i=1;i<=6;++i){appHintButton();lcdUpdate();need(appState().showInstructions,"HINT left help too early");char expected[21];snprintf(expected,sizeof(expected),"CARA MAIN %u/6",i);need(std::string(sim::lcdCells[0]).find(expected)!=std::string::npos,"wrong tutorial page");if(i<6)need(std::string(sim::lcdCells[3])==std::string(20,' '),"tutorial must not show HINT: Seterusnya");}appHintButton();need(!appState().showInstructions,"HINT after last page must return to menu");}
static void help_next(){fixture();appHintButton();appNextButton();need(appState().mode==AppMode::STOPPED&&appState().showInstructions,"NEXT must not leave the tutorial before HINT finishes all pages");}
static void hint_toggle(){fixture();start();appHintButton();need(testQuiz().showHint,"first HINT should open hint");const uint8_t index=testQuiz().index;advance(2000);appHintButton();need(!testQuiz().showHint,"second HINT should return to question");need(testQuiz().index==index&&testQuiz().score==0,"hint changed question or score");need(quizElapsedMs()>=2500,"hint paused the clock");}
static void header(){fixture();start();sim::now+=13500;lcdUpdate();need(std::string(sim::lcdCells[0])=="Q1/5    00:14   S0/5","game header must match Q/time/S layout");}
static void single_scan(){fixture();start();select("P1");quizOnScan(0,tag(Shape::PYRAMID,0));need(testQuiz().score==1&&testQuiz().awarded,"one correct solid scan must award a point without a net scan");quizOnScan(0,tag(Shape::PYRAMID,0));need(testQuiz().score==1,"same scan scored twice");advance(2000);need(testQuiz().index==1,"correct answer did not advance automatically");}
static void net_reader(){fixture();start();select("C3");need(rfidGetMode()==ScanMode::R2,"net question must enable R2 only");quizOnScan(0,tag(Shape::CONE,0));need(testQuiz().score==0,"wrong reader scored");quizOnScan(1,tag(Shape::CUBE,1));need(testQuiz().score==0,"wrong shape scored");quizOnScan(1,tag(Shape::CONE,1));need(testQuiz().score==1,"one correct net scan must award a point");}
static void skip_notice(){fixture();start();appNextButton();need(testQuiz().index==0,"skip notice must appear before advancing");lcdUpdate();need(std::string(sim::lcdCells[1]).find("Soalan dilangkau.")!=std::string::npos,"missing skip message");advance(2000);need(testQuiz().index==1&&testQuiz().score==0,"skip did not advance for zero marks");}
static void pending_buttons(){fixture();start();appNextButton();appNextButton();appHintButton();advance(2000);need(testQuiz().index==1&&testQuiz().score==0&&!testQuiz().showHint,"buttons during notice must not skip another question");}
static void finish_correct(){fixture();start();testQuiz().index=testQuiz().length-1;testQuiz().score=3;select("K1");quizOnScan(0,tag(Shape::CUBE,0));need(testQuiz().score==4,"last correct answer did not score");const uint32_t time=quizElapsedMs();advance(2000);need(testQuiz().phase==QuizPhase::SUMMARY,"last correct scan must reach final results automatically");need(quizElapsedMs()==time,"result clock did not freeze at final answer");lcdUpdate();need(std::string(sim::lcdCells[1]).find("Skor: 4/5 (80%)")!=std::string::npos,"final score does not match preview");appHintButton();need(appState().mode==AppMode::STOPPED,"result HINT must return to menu");appNextButton();need(testQuiz().index==0&&testQuiz().score==0&&quizElapsedMs()==0,"new round did not reset counters");}
static void finish_skip(){fixture();start();testQuiz().index=testQuiz().length-1;testQuiz().score=3;appNextButton();const uint32_t time=quizElapsedMs();advance(2000);need(testQuiz().phase==QuizPhase::SUMMARY&&testQuiz().score==3,"last skip must finish without an extra point");need(quizElapsedMs()==time,"last skip must freeze result time");lcdUpdate();need(std::string(sim::lcdCells[1]).find("Skor: 3/5 (60%)")!=std::string::npos,"wrong skipped result score");}
static void fresh_reader(){fixture();rfidSetMode(ScanMode::R1);rfidRequireFreshCards();advance(500);need(rfidPadsArmed(),"single-reader arming is waiting for disabled reader");}
static void held_card(){fixture();start();select("C3");testQuiz().order[1]=questionId("C3");auto& card=sim::cards[1];const Uid& uid=tag(Shape::CONE,1);card.present=true;card.size=uid.size;memcpy(card.bytes,uid.bytes,10);advance(300);need(testQuiz().score==1,"reader driver failed to deliver single correct card");advance(2500);need(testQuiz().index==1&&testQuiz().score==1,"held card answered the next question");card.present=false;advance(500);card.present=true;advance(300);need(testQuiz().score==2,"card could not answer again after lifting and re-scanning");}
static void leds(){fixture();start();select("C3");rgbUpdate();
#if GEODECODER_RGB_ENABLED
 need(sim::pins[14]==LOW&&sim::pins[17]==HIGH,"only R2 RGB blue channel should light for a net question");
#else
 need(sim::pins[25]==LOW&&sim::pins[26]==HIGH,"only the R2 LED should light for a net question");
#endif
}
static void clock_rollover(){fixture();sim::now=UINT32_MAX-1000;need(appPlay(true),"rollover start failed");advance(2500);need(quizElapsedMs()==2500,"millis rollover corrupted elapsed time");quizFinishClock();const uint32_t time=quizElapsedMs();advance(2000);need(quizElapsedMs()==time,"finished rollover clock changed");}
static void long_time(){fixture();start();sim::now+=3902500;char text[16];quizFormatTime(text,sizeof(text));need(!strcmp(text,"65:03"),"time must remain minutes:seconds beyond one hour");lcdUpdate();need(strlen(sim::lcdCells[0])==20&&std::string(sim::lcdCells[0]).find("S0/5")!=std::string::npos,"long time overflowed LCD header");}
static void saved_tags(){fixture();RegistryData saved=testRegistry();memset(&testRegistry(),0,sizeof(testRegistry()));registryBegin();need(!memcmp(&saved,&testRegistry(),sizeof(saved)),"existing NVS registry could not be restored");command("use kubus piramid");need(testRegistry().activeMask==(shapeBit(Shape::CUBE)|shapeBit(Shape::PYRAMID)),"use command stopped working");uint8_t out[ROUND_TARGET]={};need(bankBuildRound(testRegistry().activeMask,out)==5,"two active shapes should offer five distinct questions from six");for(auto i:out)need(QUESTIONS[i].answer==Shape::CUBE||QUESTIONS[i].answer==Shape::PYRAMID,"inactive shape selected");}

static void all_copies(){
 fixture();start();
 for(const auto& expected:EXPECTED_DISPLAYS){
  testQuiz().index=0;testQuiz().order[0]=questionId(expected.id);quizRetry();quizArmCurrentReader();lcdUpdate();
  need(quizCurrentQuestion()->reader==expected.reader,"question targets the wrong reader");
  for(unsigned row=0;row<3;++row){std::string line=expected.question[row];need(line.size()<=20,"question exceeds 20 columns");line.resize(20,' ');need(line==sim::lcdCells[row+1],"question LCD copy differs from expected text");}
  appHintButton();lcdUpdate();
  for(unsigned row=0;row<3;++row){std::string line=expected.hint[row];need(line.size()<=20,"hint exceeds 20 columns");line.resize(20,' ');need(line==sim::lcdCells[row+1],"hint LCD copy differs from expected text");}
 }
}
static void physical_hint(){
 fixture();sim::pins[BUTTON_PINS[1]]=LOW;advance(39);need(!appState().showInstructions,"button debounce accepted a short press");advance(2);need(appState().showInstructions&&appState().instructionPage==0,"physical HINT did not open tutorial page 1");advance(2000);need(appState().instructionPage==0,"holding HINT advanced more than one page");sim::pins[BUTTON_PINS[1]]=HIGH;advance(41);sim::pins[BUTTON_PINS[1]]=LOW;advance(41);need(appState().instructionPage==1,"second physical HINT did not advance tutorial");
}
static void complete_round(){
 fixture();start();
 for(unsigned i=0;i<5;++i){need(testQuiz().phase==QuizPhase::QUESTION&&testQuiz().index==i,"round question sequence is wrong");if(i==1)appNextButton();else{const Question& q=*quizCurrentQuestion();quizOnScan(q.reader,tag(q.answer,q.reader));}advance(1500);}
 need(testQuiz().phase==QuizPhase::SUMMARY&&testQuiz().score==4&&testQuiz().index==4,"five-question round did not finish at 4/5 after one skip");const uint32_t elapsed=quizElapsedMs();advance(3000);need(quizElapsedMs()==elapsed,"finished full-round timer is still running");
}
static void late_notice_buttons(){
 for(unsigned button=0;button<2;++button){
  fixture();start();appNextButton();advance(QUIZ_NOTICE_MS-20);sim::pins[BUTTON_PINS[button]]=LOW;advance(1500);
  need(testQuiz().index==1&&!testQuiz().advancePending&&!testQuiz().showHint,"press beginning during notice affected the next question after debounce");
  fixture();start();testQuiz().index=testQuiz().length-1;appNextButton();advance(QUIZ_NOTICE_MS-20);sim::pins[BUTTON_PINS[button]]=LOW;advance(1500);
  need(appState().mode==AppMode::PLAY&&testQuiz().phase==QuizPhase::SUMMARY&&testQuiz().score==0,"late notice press dismissed or reset final results");
 }
}


static void nvs_failed_write(){
 fixture();const RegistryData before=registryState();
 Uid replacement={4,{0x04,0x77,0x88,0x99}};
 sim::nvsWriteOk=false;
 need(!registryAssign(0,Shape::CUBE,replacement),"failed write reported success");
 need(!memcmp(&before,&registryState(),sizeof(before)),"failed write changed accepted RAM mapping");
 sim::nvsWriteOk=true;
 sim::nvsShortWrite=true;
 need(!registryAssign(0,Shape::CUBE,replacement),"partial write reported success");
 need(!memcmp(&before,&registryState(),sizeof(before)),"partial write changed accepted RAM mapping");
 sim::nvsShortWrite=false;
 need(registryAssign(0,Shape::CUBE,replacement),"storage did not recover after failed write");
 uint8_t reader=255;need(registryLookup(replacement,reader)==Shape::CUBE&&reader==0,"recovered mapping unusable");
}
static void nvs_unavailable(){
 fixture();sim::nvsAvailable=false;registryBegin();
 const RegistryData before=registryState();Uid uid={4,{4,9,8,7}};
 need(!registryIsStorageReady()&&!registryAssign(0,Shape::CUBE,uid),"unavailable NVS accepted registration");
 need(!memcmp(&before,&registryState(),sizeof(before)),"unavailable storage changed registry");
}
static void duplicate_mapping(){
 fixture();const RegistryData before=registryState();
 need(!registryAssign(0,Shape::CONE,tag(Shape::CUBE,0)),"duplicate UID accepted in another slot");
 need(!memcmp(&before,&registryState(),sizeof(before)),"duplicate rejection changed mapping");
}
static void corrupt_storage(){
 fixture();auto &bytes=fakeNvs["geomath_q2/registry"];bytes[4]=99;
 registryBegin();need(!registryActiveReady()&&!registryState().tags[0][0].size,"invalid version loaded as valid tags");
 need(bytes[4]==99,"invalid storage was silently overwritten");
}
static void paused_application(){
 fixture();start();advance(1000);command("stop");const uint32_t paused=quizElapsedMs();
 advance(5000);need(quizElapsedMs()==paused,"stop kept clock running");
 command("play");advance(500);
 need(quizElapsedMs()==paused+500&&quizState().index==0,"resume counted paused time or changed question");
}
static void serial_overflow_recovery(){
 fixture();const RegistryData before=registryState();Serial.output.clear();
 const std::string input=std::string(200,'x')+"\n";
 for(char c:input)Serial.input.push_back(c);
 for(int i=0;i<5;++i)serialUpdate();
 need(Serial.output.find("terlalu panjang")!=std::string::npos,"oversized command was not rejected");
 need(!memcmp(&before,&registryState(),sizeof(before)),"oversized command changed configuration");
 for(char c:std::string("use cube pyramid\n"))Serial.input.push_back(c);
 while(Serial.available())serialUpdate();
 need(registryState().activeMask==3,"valid command failed after rejected line");
}
static void legacy_nvs_image(){
 fixture();
 // Literal bytes from the pre-refactor 120-byte ESP32 layout, independent of
 // the current serializer. The two four-byte UIDs are synthetic test values.
 std::vector<uint8_t> bytes(120,0);
 bytes[0]=0x32;bytes[1]=0x51;bytes[2]=0x4D;bytes[3]=0x47;
 bytes[4]=1;bytes[6]=1;
 bytes[8]=4;bytes[9]=4;bytes[10]=0xA1;bytes[11]=0xB2;bytes[12]=0xC3;
 bytes[19]=4;bytes[20]=4;bytes[21]=0xD1;bytes[22]=0xE2;bytes[23]=0xF3;
 fakeNvs["geomath_q2/registry"]=bytes;registryBegin();
 need(registryState().activeMask==1&&registryReady(Shape::CUBE),"legacy active shape or UID slots not restored");
 const Uid solid={4,{4,0xA1,0xB2,0xC3}},net={4,{4,0xD1,0xE2,0xF3}};
 uint8_t reader=255;
 need(registryLookup(solid,reader)==Shape::CUBE&&reader==0,"legacy solid UID role changed");
 need(registryLookup(net,reader)==Shape::CUBE&&reader==1,"legacy net UID role changed");
 need(appPlay(true)&&quizState().length==3,"legacy registry cannot start its original filtered round");
}

int main(){
 const std::pair<const char*,void(*)()> tests[]={{"bank_15_and_round_variety",bank},{"menu_copy",menu},{"six_help_pages",help_pages},{"help_blocks_next",help_next},{"hint_toggle_and_timer",hint_toggle},{"lcd_header",header},{"one_solid_scan_and_no_double_award",single_scan},{"net_reader_and_wrong_answers",net_reader},{"skip_notice_zero_points",skip_notice},{"buttons_during_notice",pending_buttons},{"automatic_last_correct_result",finish_correct},{"last_skip_result",finish_skip},{"single_reader_arming",fresh_reader},{"held_card_requires_removal",held_card},{"per_reader_led",leds},{"millis_rollover",clock_rollover},{"minutes_seconds_after_one_hour",long_time},{"nvs_and_filtered_round",saved_tags},{"all_15_question_and_hint_displays",all_copies},{"physical_hint_debounce_and_hold",physical_hint},{"complete_five_question_round",complete_round},{"physical_late_notice_buttons",late_notice_buttons},{"failed_nvs_write_is_transactional",nvs_failed_write},{"unavailable_nvs_rejects_registration",nvs_unavailable},{"duplicate_uid_keeps_mapping",duplicate_mapping},{"corrupt_storage_not_loaded_or_overwritten",corrupt_storage},{"application_pause_resume_clock",paused_application},{"serial_overflow_then_valid_command",serial_overflow_recovery},{"legacy_nvs_byte_image",legacy_nvs_image}};
 unsigned failures=0;for(const auto& test:tests){try{test.second();std::cout<<"PASS "<<test.first<<'\n';}catch(const std::exception& error){++failures;std::cout<<"FAIL "<<test.first<<": "<<error.what()<<'\n';}}
 std::cout<<(sizeof(tests)/sizeof(tests[0])-failures)<<"/"<<sizeof(tests)/sizeof(tests[0])<<" passed\n";return failures?1:0;
}

