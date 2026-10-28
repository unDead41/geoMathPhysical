// Exercise the real application, LCD and device adapters. Only electrical I/O
// is simulated. Literal expectations intentionally do not call flow helpers.
static void focus_driven_pairs() {
 const char* ids[]={"P1","P2","P3","S1","S2","S3","K1","K2","K3","C1","C2","C3","B1","B2","B3"};
 for(unsigned i=0;i<15;++i){
  fixture();start();select(ids[i]);const Shape shape=quizCurrentQuestion()->answer;
  const uint8_t first=i%3==2?1:0,second=1-first;
  need(quizActiveReader()==first,"question focus did not choose the first physical reader");
  need(appReaderColor(first)==RgbColor::BLUE&&appReaderColor(second)==RgbColor::OFF,"first/second initial colours wrong");
  quizOnScan(second,tag(shape,second));need(testQuiz().score==0&&quizActiveReader()==first,"second reader answered too early");
  quizOnScan(first,tag(shape,first));
  need(testQuiz().score==0&&quizActiveReader()==second&&appReaderColor(first)==RgbColor::GREEN,"first card scored or lost its green colour");
  appHintButton();need(appReaderColor(first)==RgbColor::GREEN&&appReaderColor(second)==RgbColor::MAGENTA,"second hint did not preserve completed reader");
  const uint32_t time=quizElapsedMs();advance(100);need(quizElapsedMs()==time+100,"hint stopped the stopwatch");
  quizOnScan(first,tag(shape,first));need(testQuiz().score==0,"completed reader scored twice");
  quizOnScan(second,tag(shape,second));quizOnScan(second,tag(shape,second));
  need(testQuiz().score==1&&testQuiz().advancePending,"pair did not score exactly once");
 }
}

static void terminal_wrong_at_either_stage() {
 for(const char* id:{"P1","P3"})for(unsigned stage=0;stage<2;++stage){
  fixture();start();select(id);testQuiz().score=2;
  const uint8_t first=id[1]=='3'?1:0;
  if(stage)quizOnScan(first,tag(Shape::PYRAMID,first));
  const uint8_t active=stage?1-first:first;advance(123);
  quizOnScan(active,tag(Shape::CUBE,active));const uint32_t time=quizElapsedMs();
  need(testQuiz().feedback==Feedback::WRONG&&!testQuiz().clockRunning&&rfidGetMode()==ScanMode::STOPPED,"wrong answer did not finalize and pause immediately");
  need(!appInputBlocked(),"wrong answer blocks NEXT along with other inputs");
  for(unsigned ms=0;ms<4800;++ms){
   const RgbColor colour=(ms/150)%2?RgbColor::OFF:RgbColor::RED;
   need(appReaderColor(0)==colour&&appReaderColor(1)==colour,"wrong blink is not continuous synchronous 150ms ON/OFF");
   quizOnScan(0,tag(Shape::PYRAMID,0));quizOnScan(1,tag(Shape::PYRAMID,1));
   appHintButton();if(ms%100==0)command("retry");advance(1);
   need(quizElapsedMs()==time&&testQuiz().index==0&&testQuiz().score==2&&testQuiz().wrongAttempts==1,"wrong result reopened, scored or counted waiting time");
  }
  appNextButton();need(testQuiz().index==1&&testQuiz().score==2&&testQuiz().clockRunning,"NEXT did not continue after wrong");
  need(quizElapsedMs()==time,"continuation counted explanation time");advance(137);
  need(quizElapsedMs()==time+137,"clock did not resume when the next question opened");
 }
}

static void wrong_survives_stop_play_and_tools() {
 fixture();start();select("K3");testQuiz().index=testQuiz().length-1;testQuiz().order[testQuiz().index]=questionId("K3");
 command("stop");command("play");quizOnScan(1,tag(Shape::CONE,1));
 const uint32_t time=quizElapsedMs();const uint8_t last=testQuiz().index;
 for(const char* cmd:{"retry","clear","stop","play","hint","check uid","play","test/led/random","test/stop","play"}){
  command(cmd);advance(1700);
  need(testQuiz().feedback==Feedback::WRONG&&testQuiz().index==last&&testQuiz().score==0&&quizElapsedMs()==time,"maintenance command reopened a finalized wrong question");
 }
 need(appState().mode==AppMode::PLAY&&rfidGetMode()==ScanMode::STOPPED,"play did not restore the locked explanation");
 appNextButton();need(testQuiz().phase==QuizPhase::SUMMARY&&quizElapsedMs()==time,"last wrong NEXT failed to finish with frozen time");
 advance(3000);need(quizElapsedMs()==time,"summary resumed wrong-question time");
 appNextButton();need(testQuiz().score==0&&testQuiz().index==0&&quizElapsedMs()==0&&testQuiz().clockRunning,"restart kept the finalized result");
}

static void wrong_next_physical_hold() {
 fixture();start();select("P1");quizOnScan(0,tag(Shape::CUBE,0));advance(950);
 sim::pins[33]=LOW;advance(1100);need(testQuiz().feedback==Feedback::WRONG,"HINT changed wrong result");
 sim::pins[32]=LOW;advance(3000);
 need(testQuiz().index==1&&!testQuiz().advancePending&&!testQuiz().showHint&&testQuiz().clockRunning,"held physical NEXT skipped two questions or was blocked");
 sim::pins[32]=sim::pins[33]=HIGH;advance(41);sim::pins[32]=LOW;advance(41);
 need(testQuiz().advancePending,"fresh NEXT after release did not skip");advance(1200);
 need(testQuiz().index==2&&!testQuiz().advancePending,"held NEXT repeated after skip blink");
}

static void stale_cards_in_both_orders() {
 for(const char* id:{"P1","P3"}){
  fixture();start();select(id);testQuiz().order[1]=questionId(id);
  const uint8_t first=id[1]=='3'?1:0,second=1-first;
  for(unsigned r=0;r<2;++r){const Uid& uid=tag(Shape::PYRAMID,r);sim::cards[r].size=uid.size;memcpy(sim::cards[r].bytes,uid.bytes,10);}
  sim::cards[second].present=true;advance(300);sim::cards[first].present=true;advance(500);
  need(quizActiveReader()==second&&testQuiz().score==0,"prepositioned second card answered its new stage");
  // First card may be removed: this is sequential scanning, not simultaneous presence.
  sim::cards[first].present=false;sim::cards[second].present=false;advance(220);
  sim::cards[second].present=true;advance(200);need(testQuiz().score==1,"sequential pair required both cards to remain present");
  sim::cards[first].present=true;advance(1300);
  need(testQuiz().index==1&&testQuiz().score==1&&quizActiveReader()==first,"old first card answered next question");
  sim::cards[first].present=false;advance(220);sim::cards[first].present=true;advance(500);
  need(quizActiveReader()==second&&testQuiz().score==1,"held second card answered a new question");
  sim::cards[second].present=false;advance(220);sim::cards[second].present=true;advance(200);
  need(testQuiz().score==2,"fresh second scan after removal failed");
 }
}

static void wrong_next_requires_fresh_card() {
 fixture();start();select("P1");testQuiz().order[1]=questionId("K1");
 const Uid& uid=tag(Shape::CUBE,0);sim::cards[0].size=uid.size;memcpy(sim::cards[0].bytes,uid.bytes,10);
 sim::cards[0].present=true;advance(500);need(testQuiz().feedback==Feedback::WRONG,"physical wrong card not finalized");
 appNextButton();advance(1200);need(testQuiz().index==1&&quizActiveReader()==0&&testQuiz().score==0,"held wrong card answered the next question");
 sim::cards[0].present=false;advance(220);sim::cards[0].present=true;advance(200);
 need(quizActiveReader()==1&&testQuiz().score==0,"removed card cannot answer the new question");
}

static void all_wrong_explanations() {
 const char* expected[15][3]={
  {"PIRAMID","Tapak persegi dan","4 muka segi tiga."},
  {"PIRAMID","V=luas tapak*t/3","Tapak persegi: a^2"},
  {"PIRAMID","1 segi empat sama,","4 segi tiga dilipat."},
  {"SILINDER","2 tapak bulat sama;","sisi melengkung."},
  {"SILINDER","V=luas tapak*t","L=2*pi*j^2+2*pi*j*t"},
  {"SILINDER","2 bulatan sama saiz;","1 segi empat tepat."},
  {"KUBUS","6 muka segi empat","sama saiz dan bentuk"},
  {"KUBUS","V=a*a*a; a=rusuk","L=6 muka, tiap a^2"},
  {"KUBUS","6 petak sama saiz","dilipat jadi 6 muka."},
  {"KON","V=luas tapak*t/3","Tapak bulat: pi*j^2"},
  {"KON","L=tapak+luas sisi","pi*j^2 + pi*j*s"},
  {"KON","1 sektor jadi sisi;","1 bulatan jadi tapak"},
  {"KUBOID","Panjang,lebar,tinggi","3 ukuran berbeza."},
  {"KUBOID","V=luas tapak*t","Tapak=p*l; tinggi=t"},
  {"KUBOID","2 muka setiap saiz:","6x4, 6x3 dan 4x3 cm"}};
 for(unsigned i=0;i<15;++i)for(unsigned stage=0;stage<2;++stage){
  fixture();start();select(EXPECTED_DISPLAYS[i].id);
  lcdUpdate();for(unsigned row=1;row<4;++row)need(std::string(sim::lcdCells[row]).find(expected[i][0])==std::string::npos,"answer name leaked in ordinary question");
  appHintButton();lcdUpdate();
  for(unsigned row=1;row<4;++row)need(std::string(sim::lcdCells[row]).find(expected[i][0])==std::string::npos,"answer name leaked in ordinary hint");
  appHintButton();
  const uint8_t first=i%3==2?1:0,reader=stage?1-first:first;
  if(stage)quizOnScan(first,tag(quizCurrentQuestion()->answer,first));
  const Shape wrong=i<6?Shape::CUBE:Shape::PYRAMID;
  quizOnScan(reader,tag(wrong,reader));lcdUpdate();
  const std::string rows[]={"SALAH +0 NEXT:Terus",std::string("Jawapan: ")+expected[i][0],expected[i][1],expected[i][2]};
  for(unsigned row=0;row<4;++row){
   need(rows[row].size()<=20,"expected explanation exceeds LCD width");
   for(char c:rows[row])need(c>=32&&c<=126,"explanation is not printable ASCII");
   std::string padded=rows[row];padded.resize(20,' ');if(padded!=sim::lcdCells[row])throw std::runtime_error(std::string(EXPECTED_DISPLAYS[i].id)+" row="+std::to_string(row)+" expected=["+padded+"] actual=["+sim::lcdCells[row]+"]");
  }
  advance(5000);lcdUpdate();
  for(unsigned row=0;row<4;++row){std::string padded=rows[row];padded.resize(20,' ');need(padded==sim::lcdCells[row],"wrong explanation expired or changed while waiting");}
 }
}
