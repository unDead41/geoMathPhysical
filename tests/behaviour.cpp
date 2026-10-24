// Executes the actual .ino tabs; only electrical/device I/O is simulated.
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <iostream>
#include <stdexcept>
#include <set>

namespace sim {uint32_t now=0,rng=7;std::array<int,64> pins={};Card cards[2]={};}
FakeSerial Serial;
FakeSPI SPI;
FakeWire Wire;
std::map<std::string,std::vector<uint8_t>> fakeNvs;

#ifdef GEODECODER_ENTRYPOINT
#include GEODECODER_ENTRYPOINT
#else
#include "main.ino"
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

static void need(bool value,const char* message){if(!value)throw std::runtime_error(message);}
static void advance(uint32_t duration){for(uint32_t i=0;i<duration;++i){++sim::now;loop();}}
static void command(const char* text){char copy[200];strncpy(copy,text,sizeof(copy));copy[sizeof(copy)-1]=0;serialExecute(copy);}
static void fixture(){
 sim::now=0;sim::rng=7;sim::pins.fill(LOW);memset(sim::cards,0,sizeof(sim::cards));fakeNvs.clear();Serial.output.clear();
 setup();
 for(uint8_t s=0;s<SHAPE_COUNT;++s)for(uint8_t r=0;r<2;++r){Uid uid={4,{0x04,uint8_t(s+1),uint8_t(r+1),0xA5}};need(registryAssign(r,Shape(s),uid),"test enrol failed");}
 need(registrySetActive(ALL_SHAPES_MASK),"test active set failed");
 appConfigurationChanged();lcdUpdate();
}
static uint8_t questionId(const char* id){for(uint8_t i=0;i<QUESTION_COUNT;++i)if(!strcmp(QUESTIONS[i].id,id))return i;throw std::runtime_error("question ID missing");}
static void start(){need(appPlay(true),"round did not start");advance(500);}
static void select(const char* id){quiz.order[quiz.index]=questionId(id);appInspect(ScanMode::BOTH);need(appPlay(false),"resume failed");advance(500);}
static const Uid& tag(Shape shape,uint8_t reader){return registryData.tags[uint8_t(shape)][reader];}

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
static void menu(){fixture();need(std::string(lcd.cells[1]).find("Jom uji minda 3D!")!=std::string::npos,"menu copy does not match preview");}
static void help_pages(){fixture();for(unsigned i=1;i<=6;++i){appHintButton();lcdUpdate();need(appShowInstructions,"HINT left help too early");char expected[21];snprintf(expected,sizeof(expected),"CARA MAIN %u/6",i);need(std::string(lcd.cells[0]).find(expected)!=std::string::npos,"wrong tutorial page");if(i<6)need(std::string(lcd.cells[3])==std::string(20,' '),"tutorial must not show HINT: Seterusnya");}appHintButton();need(!appShowInstructions,"HINT after last page must return to menu");}
static void help_next(){fixture();appHintButton();appNextButton();need(appMode==AppMode::STOPPED&&appShowInstructions,"NEXT must not leave the tutorial before HINT finishes all pages");}
static void hint_toggle(){fixture();start();appHintButton();need(quiz.showHint,"first HINT should open hint");const uint8_t index=quiz.index;advance(2000);appHintButton();need(!quiz.showHint,"second HINT should return to question");need(quiz.index==index&&quiz.score==0,"hint changed question or score");need(quizElapsedMs()>=2500,"hint paused the clock");}
static void header(){fixture();start();sim::now+=13500;lcdUpdate();need(std::string(lcd.cells[0])=="Q1/5    00:14   S0/5","game header must match Q/time/S layout");}
static void single_scan(){fixture();start();select("P1");quizOnScan(0,tag(Shape::PYRAMID,0));need(quiz.score==1&&quiz.awarded,"one correct solid scan must award a point without a net scan");quizOnScan(0,tag(Shape::PYRAMID,0));need(quiz.score==1,"same scan scored twice");advance(2000);need(quiz.index==1,"correct answer did not advance automatically");}
static void net_reader(){fixture();start();select("C3");need(rfidGetMode()==ScanMode::R2,"net question must enable R2 only");quizOnScan(0,tag(Shape::CONE,0));need(quiz.score==0,"wrong reader scored");quizOnScan(1,tag(Shape::CUBE,1));need(quiz.score==0,"wrong shape scored");quizOnScan(1,tag(Shape::CONE,1));need(quiz.score==1,"one correct net scan must award a point");}
static void skip_notice(){fixture();start();appNextButton();need(quiz.index==0,"skip notice must appear before advancing");lcdUpdate();need(std::string(lcd.cells[1]).find("Soalan dilangkau.")!=std::string::npos,"missing skip message");advance(2000);need(quiz.index==1&&quiz.score==0,"skip did not advance for zero marks");}
static void pending_buttons(){fixture();start();appNextButton();appNextButton();appHintButton();advance(2000);need(quiz.index==1&&quiz.score==0&&!quiz.showHint,"buttons during notice must not skip another question");}
static void finish_correct(){fixture();start();quiz.index=quiz.length-1;quiz.score=3;select("K1");quizOnScan(0,tag(Shape::CUBE,0));need(quiz.score==4,"last correct answer did not score");const uint32_t time=quizElapsedMs();advance(2000);need(quiz.phase==QuizPhase::SUMMARY,"last correct scan must reach final results automatically");need(quizElapsedMs()==time,"result clock did not freeze at final answer");lcdUpdate();need(std::string(lcd.cells[1]).find("Skor: 4/5 (80%)")!=std::string::npos,"final score does not match preview");appHintButton();need(appMode==AppMode::STOPPED,"result HINT must return to menu");appNextButton();need(quiz.index==0&&quiz.score==0&&quizElapsedMs()==0,"new round did not reset counters");}
static void finish_skip(){fixture();start();quiz.index=quiz.length-1;quiz.score=3;appNextButton();const uint32_t time=quizElapsedMs();advance(2000);need(quiz.phase==QuizPhase::SUMMARY&&quiz.score==3,"last skip must finish without an extra point");need(quizElapsedMs()==time,"last skip must freeze result time");lcdUpdate();need(std::string(lcd.cells[1]).find("Skor: 3/5 (60%)")!=std::string::npos,"wrong skipped result score");}
static void fresh_reader(){fixture();rfidSetMode(ScanMode::R1);rfidRequireFreshCards();advance(500);need(rfidPadsArmed(),"single-reader arming is waiting for disabled reader");}
static void held_card(){fixture();start();select("C3");quiz.order[1]=questionId("C3");auto& card=sim::cards[1];const Uid& uid=tag(Shape::CONE,1);card.present=true;card.size=uid.size;memcpy(card.bytes,uid.bytes,10);advance(300);need(quiz.score==1,"reader driver failed to deliver single correct card");advance(2500);need(quiz.index==1&&quiz.score==1,"held card answered the next question");card.present=false;advance(500);card.present=true;advance(300);need(quiz.score==2,"card could not answer again after lifting and re-scanning");}
static void leds(){fixture();start();select("C3");rgbUpdate();
#if GEODECODER_RGB_ENABLED
 need(sim::pins[14]==LOW&&sim::pins[17]==HIGH,"only R2 RGB blue channel should light for a net question");
#else
 need(sim::pins[25]==LOW&&sim::pins[26]==HIGH,"only the R2 LED should light for a net question");
#endif
}
static void clock_rollover(){fixture();sim::now=UINT32_MAX-1000;need(appPlay(true),"rollover start failed");advance(2500);need(quizElapsedMs()==2500,"millis rollover corrupted elapsed time");quizFinishClock();const uint32_t time=quizElapsedMs();advance(2000);need(quizElapsedMs()==time,"finished rollover clock changed");}
static void long_time(){fixture();start();sim::now+=3902500;char text[16];quizFormatTime(text,sizeof(text));need(!strcmp(text,"65:03"),"time must remain minutes:seconds beyond one hour");lcdUpdate();need(strlen(lcd.cells[0])==20&&std::string(lcd.cells[0]).find("S0/5")!=std::string::npos,"long time overflowed LCD header");}
static void saved_tags(){fixture();RegistryData saved=registryData;memset(&registryData,0,sizeof(registryData));registryBegin();need(!memcmp(&saved,&registryData,sizeof(saved)),"existing NVS registry could not be restored");command("use kubus piramid");need(registryData.activeMask==(shapeBit(Shape::CUBE)|shapeBit(Shape::PYRAMID)),"use command stopped working");uint8_t out[ROUND_TARGET]={};need(bankBuildRound(registryData.activeMask,out)==5,"two active shapes should offer five distinct questions from six");for(auto i:out)need(QUESTIONS[i].answer==Shape::CUBE||QUESTIONS[i].answer==Shape::PYRAMID,"inactive shape selected");}

static void all_copies(){
 fixture();start();
 for(const auto& expected:EXPECTED_DISPLAYS){
  quiz.index=0;quiz.order[0]=questionId(expected.id);quizClearCurrent();quizArmCurrentReader();lcdUpdate();
  need(quizCurrentQuestion()->reader==expected.reader,"question targets the wrong reader");
  for(unsigned row=0;row<3;++row){std::string line=expected.question[row];need(line.size()<=20,"question exceeds 20 columns");line.resize(20,' ');need(line==lcd.cells[row+1],"question LCD copy differs from expected text");}
  appHintButton();lcdUpdate();
  for(unsigned row=0;row<3;++row){std::string line=expected.hint[row];need(line.size()<=20,"hint exceeds 20 columns");line.resize(20,' ');need(line==lcd.cells[row+1],"hint LCD copy differs from expected text");}
 }
}
static void physical_hint(){
 fixture();sim::pins[BUTTON_PINS[1]]=LOW;advance(39);need(!appShowInstructions,"button debounce accepted a short press");advance(2);need(appShowInstructions&&appInstructionPage==0,"physical HINT did not open tutorial page 1");advance(2000);need(appInstructionPage==0,"holding HINT advanced more than one page");sim::pins[BUTTON_PINS[1]]=HIGH;advance(41);sim::pins[BUTTON_PINS[1]]=LOW;advance(41);need(appInstructionPage==1,"second physical HINT did not advance tutorial");
}
static void complete_round(){
 fixture();start();
 for(unsigned i=0;i<5;++i){need(quiz.phase==QuizPhase::QUESTION&&quiz.index==i,"round question sequence is wrong");if(i==1)appNextButton();else{const Question& q=*quizCurrentQuestion();quizOnScan(q.reader,tag(q.answer,q.reader));}advance(1500);}
 need(quiz.phase==QuizPhase::SUMMARY&&quiz.score==4&&quiz.index==4,"five-question round did not finish at 4/5 after one skip");const uint32_t elapsed=quizElapsedMs();advance(3000);need(quizElapsedMs()==elapsed,"finished full-round timer is still running");
}
static void late_notice_buttons(){
 for(unsigned button=0;button<2;++button){
  fixture();start();appNextButton();advance(QUIZ_NOTICE_MS-20);sim::pins[BUTTON_PINS[button]]=LOW;advance(1500);
  need(quiz.index==1&&!quiz.advancePending&&!quiz.showHint,"press beginning during notice affected the next question after debounce");
  fixture();start();quiz.index=quiz.length-1;appNextButton();advance(QUIZ_NOTICE_MS-20);sim::pins[BUTTON_PINS[button]]=LOW;advance(1500);
  need(appMode==AppMode::PLAY&&quiz.phase==QuizPhase::SUMMARY&&quiz.score==0,"late notice press dismissed or reset final results");
 }
}

int main(){
 const std::pair<const char*,void(*)()> tests[]={{"bank_15_and_round_variety",bank},{"menu_copy",menu},{"six_help_pages",help_pages},{"help_blocks_next",help_next},{"hint_toggle_and_timer",hint_toggle},{"lcd_header",header},{"one_solid_scan_and_no_double_award",single_scan},{"net_reader_and_wrong_answers",net_reader},{"skip_notice_zero_points",skip_notice},{"buttons_during_notice",pending_buttons},{"automatic_last_correct_result",finish_correct},{"last_skip_result",finish_skip},{"single_reader_arming",fresh_reader},{"held_card_requires_removal",held_card},{"per_reader_led",leds},{"millis_rollover",clock_rollover},{"minutes_seconds_after_one_hour",long_time},{"nvs_and_filtered_round",saved_tags},{"all_15_question_and_hint_displays",all_copies},{"physical_hint_debounce_and_hold",physical_hint},{"complete_five_question_round",complete_round},{"physical_late_notice_buttons",late_notice_buttons}};
 unsigned failures=0;for(const auto& test:tests){try{test.second();std::cout<<"PASS "<<test.first<<'\n';}catch(const std::exception& error){++failures;std::cout<<"FAIL "<<test.first<<": "<<error.what()<<'\n';}}
 std::cout<<(sizeof(tests)/sizeof(tests[0])-failures)<<"/"<<sizeof(tests)/sizeof(tests[0])<<" passed\n";return failures?1:0;
}
