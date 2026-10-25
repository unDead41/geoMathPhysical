// Calibration tests use the UART, real debounce and real LED output adapter.
// A wrong alias target/colour, timer edge or duplicate gesture must fail here.
#include "hardware/component_tests.h"

// A random shortcut or a missing palette entry must fail the complete cycle.
static void calibration_complete_rgb_cycles() {
  const char *commands[] = {"R1RGB", "R2RGB"};
  const RgbColor colours[] = {RgbColor::RED, RgbColor::GREEN, RgbColor::BLUE,
    RgbColor::YELLOW, RgbColor::CYAN, RgbColor::MAGENTA, RgbColor::WHITE};
  const char *names[] = {"red", "green", "blue", "yellow", "cyan", "magenta", "white"};
  const bool channels[7][3] = {{true,false,false},{false,true,false},{false,false,true},
    {true,true,false},{false,true,true},{true,false,true},{true,true,true}};
  for (unsigned target = 0; target < 2; ++target) {
    fixture(); start(); const auto saved = fakeNvs; const uint32_t paused = quizElapsedMs();
    componentSerial(commands[target]); rgbUpdate();
    for (unsigned frame = 0; frame < 15; ++frame) {
      const unsigned c = frame % 7;
      if (frame) {
        Serial.output.clear(); advance(499);
        need(componentTestsReaderColor(target) == colours[(frame - 1) % 7] && Serial.output.empty(),
             "complete colour cycle moved or logged before 500ms");
        advance(1);
      }
      need(componentTestsActive() && componentTestsReaderColor(target) == colours[c],
           "RGB shortcut skipped or repeated a colour before completing all seven");
      componentOutputs(target == 0 && channels[c][0], target == 0 && channels[c][1], target == 0 && channels[c][2],
                       target == 1 && channels[c][0], target == 1 && channels[c][1], target == 1 && channels[c][2]);
      const std::string label = std::string("target=") + (target ? "R2" : "R1") + " colour=" + names[c];
      need(Serial.output.find(label) != std::string::npos, "cycle log does not match physical output");
    }
    need(appState().mode == AppMode::STOPPED && quizState().score == 0 &&
         quizElapsedMs() == paused && fakeNvs == saved, "complete RGB cycle changed game or NVS");
    componentSerial("test/led/off"); rgbUpdate(); componentOutputs(false,false,false,false,false,false);
  }
}

static void calibration_purple_aliases() {
  const char *commands[] = {"R1Purple", "R2Purple", "test/led/r1/purple", "test/led/r2/purple"};
  for (unsigned i = 0; i < 4; ++i) {
    fixture(); componentSerial(commands[i]); advance(501);
    const unsigned target = i % 2;
    need(componentTestsActive() && componentTestsReaderColor(target) == RgbColor::MAGENTA,
         "purple alias does not select the red+blue colour");
    componentOutputs(!target,false,!target,target,false,target);
  }
}

// Exercises gameplay output ownership on the swapped physical LEDs, not a test mode.
static void game_rgb_outputs_and_purple_hints() {
  fixture(); start(); select("P1"); const auto saved = fakeNvs; const uint32_t before = quizElapsedMs();
  rgbUpdate(); componentOutputs(false,false,true,false,false,false);
  command("hint"); rgbUpdate(); componentOutputs(true,false,true,false,false,false);
  advance(100); need(quizElapsedMs() == before + 100, "purple hint paused gameplay time");
  command("hint"); rgbUpdate(); componentOutputs(false,false,true,false,false,false);
  command("hint"); quizOnScan(0,tag(Shape::CUBE,0)); rgbUpdate();
  componentOutputs(true,false,false,false,false,false);
  advance(1200); componentOutputs(true,false,true,false,false,false);
  quizOnScan(0,tag(Shape::PYRAMID,0)); rgbUpdate();
  componentOutputs(false,true,false,false,false,true);
  command("hint"); rgbUpdate(); componentOutputs(false,true,false,true,false,true);
  quizOnScan(1,tag(Shape::CUBE,1)); rgbUpdate(); componentOutputs(false,true,false,true,false,false);
  advance(1200); componentOutputs(false,true,false,true,false,true);
  command("hint"); rgbUpdate(); componentOutputs(false,true,false,false,false,true);
  command("hint"); quizOnScan(1,tag(Shape::PYRAMID,1)); rgbUpdate();
  componentOutputs(false,true,false,false,true,false);
  need(!componentTestsActive() && quizState().score == 1 && quizState().hintsUsed == 1 && fakeNvs == saved,
       "purple game flow entered diagnostics, changed NVS or altered scoring");
}

static void calibration_led_shortcuts() {
  fixture(); start(); const auto saved = fakeNvs; const uint32_t paused = quizElapsedMs();
  const char *names[2][8] = {
    {"R1Red", "R1Green", "R1Blue", "R1Yellow", "R1Cyan", "R1Magenta", "R1White", "R1Off"},
    {"R2Red", "R2Green", "R2Blue", "R2Yellow", "R2Cyan", "R2Magenta", "R2White", "R2Off"}};
  const bool channels[8][3] = {{true,false,false},{false,true,false},{false,false,true},
    {true,true,false},{false,true,true},{true,false,true},{true,true,true},{false,false,false}};
  for (unsigned r = 0; r < 2; ++r) for (unsigned c = 0; c < 8; ++c) {
    componentSerial(names[r][c]); advance(501);
    need(componentTestsActive(), "simple RGB command did not enter diagnostics");
    componentOutputs(r == 0 && channels[c][0], r == 0 && channels[c][1], r == 0 && channels[c][2],
                     r == 1 && channels[c][0], r == 1 && channels[c][1], r == 1 && channels[c][2]);
  }
  componentSerial("  r1gReEn  "); advance(1);
  componentOutputs(false,true,false,false,false,false);
  need(quizElapsedMs() == paused && quizState().score == 0 && fakeNvs == saved &&
       rfidGetMode() == ScanMode::STOPPED, "shortcut did not isolate game/NVS");
}

static void calibration_random_leds() {
  const char *commands[] = {"R1Random", "R2Random", "test/led/all/random"};
  for (unsigned target = 0; target < 3; ++target) {
    fixture(); start(); const auto saved = fakeNvs; const uint32_t paused = quizElapsedMs();
    componentSerial(commands[target]); rgbUpdate();
    need(componentTestsActive(), "random RGB command was not routed to diagnostics");
    RgbColor previous = componentTestsReaderColor(target == 1 ? 1 : 0);
    need(previous != RgbColor::OFF, "random pattern starts dark");
    std::set<unsigned> seen; seen.insert(unsigned(previous));
    for (unsigned step = 0; step < 60; ++step) {
      Serial.output.clear(); advance(499);
      need(componentTestsReaderColor(target == 1 ? 1 : 0) == previous && Serial.output.empty(),
           "random colour changed or flooded Serial before 500ms");
      advance(1); const RgbColor colour = componentTestsReaderColor(target == 1 ? 1 : 0);
      need(colour != RgbColor::OFF && colour != previous, "random colour did not change at 500ms");
      const bool red = colour == RgbColor::RED || colour == RgbColor::YELLOW ||
        colour == RgbColor::MAGENTA || colour == RgbColor::WHITE;
      const bool green = colour == RgbColor::GREEN || colour == RgbColor::YELLOW ||
        colour == RgbColor::CYAN || colour == RgbColor::WHITE;
      const bool blue = colour == RgbColor::BLUE || colour == RgbColor::CYAN ||
        colour == RgbColor::MAGENTA || colour == RgbColor::WHITE;
      const RgbColor other = target == 2 ? componentTestsReaderColor(1) : RgbColor::OFF;
      const bool otherRed = other == RgbColor::RED || other == RgbColor::YELLOW ||
        other == RgbColor::MAGENTA || other == RgbColor::WHITE;
      const bool otherGreen = other == RgbColor::GREEN || other == RgbColor::YELLOW ||
        other == RgbColor::CYAN || other == RgbColor::WHITE;
      const bool otherBlue = other == RgbColor::BLUE || other == RgbColor::CYAN ||
        other == RgbColor::MAGENTA || other == RgbColor::WHITE;
      componentOutputs(target != 1 && red, target != 1 && green, target != 1 && blue,
                       target == 1 ? red : otherRed, target == 1 ? green : otherGreen, target == 1 ? blue : otherBlue);
      need(Serial.output.find("colour=") != std::string::npos, "random colour not labelled for calibration");
      seen.insert(unsigned(colour)); previous = colour;
    }
    need(seen.size() == 7, "random sample never exercises all seven colours");
    sim::pins[32] = sim::pins[33] = LOW; advance(1100);
    need(appState().mode == AppMode::STOPPED && !appState().showInstructions &&
         quizElapsedMs() == paused && quizState().score == 0 && fakeNvs == saved,
         "random RGB mode allowed buttons, score, clock or NVS changes");
    componentSerial("test/led/off"); advance(1001); componentOutputs(false,false,false,false,false,false);
  }
}

static void distinctPairOutputs(RgbColor first, RgbColor second) {
  need(unsigned(first) >= 1 && unsigned(first) <= 7 && unsigned(second) >= 1 && unsigned(second) <= 7,
       "random colour is OFF or outside the palette");
  need(first != second, "random R1 and R2 displayed the same colour");
  const bool channels[8][3] = {{false,false,false},{false,false,true},{false,true,false},
    {true,false,false},{true,true,false},{false,true,true},{true,false,true},{true,true,true}};
  componentOutputs(channels[unsigned(first)][0],channels[unsigned(first)][1],channels[unsigned(first)][2],
                   channels[unsigned(second)][0],channels[unsigned(second)][1],channels[unsigned(second)][2]);
}

static void calculated_ambient_pairs() {
  for (unsigned seed = 0; seed < 32; ++seed) {
    fixture(); sim::rng = seed; const auto saved = fakeNvs;
    rgbUpdate(); distinctPairOutputs(appReaderColor(0),appReaderColor(1));
    for (unsigned phase = 0; phase < 3; ++phase) {
      const unsigned interval = phase == 2 ? 150 : 1000;
      if (phase == 1) appHintButton(); // The instructions use the same slow palette.
      if (phase == 2) {
        appStop(); start(); testQuiz().index = testQuiz().length - 1; appNextButton(); advance(900);
      }
      const uint32_t frozen = quizElapsedMs();
      rgbUpdate(); distinctPairOutputs(appReaderColor(0),appReaderColor(1));
      for (unsigned tick = 0; tick < 100; ++tick) {
        const RgbColor first = appReaderColor(0), second = appReaderColor(1);
        sim::now += interval - 1; loop();
        need(appReaderColor(0) == first && appReaderColor(1) == second, "distinct random pair changed early");
        ++sim::now; loop();
        distinctPairOutputs(appReaderColor(0),appReaderColor(1));
        need(appReaderColor(0) != first && appReaderColor(1) != second, "ambient pair repeated a reader colour");
      }
      need(quizElapsedMs() == frozen && quizState().score == 0 && fakeNvs == saved,
           "distinct ambient colours changed time, score or saved cards");
    }
    appHintButton(); rgbUpdate(); distinctPairOutputs(appReaderColor(0),appReaderColor(1));
  }
}

static void calculated_diagnostic_pairs() {
  const char *commands[] = {"test/led/random", "test/led/all/random"};
  for (const char *name : commands) for (unsigned seed = 0; seed < 32; ++seed) {
    fixture(); start(); sim::rng = seed; const auto saved = fakeNvs; const uint32_t paused = quizElapsedMs();
    componentSerial(name); rgbUpdate();
    distinctPairOutputs(componentTestsReaderColor(0),componentTestsReaderColor(1));
    for (unsigned tick = 0; tick < 100; ++tick) {
      const RgbColor first = componentTestsReaderColor(0), second = componentTestsReaderColor(1);
      Serial.output.clear(); sim::now += 499; loop();
      need(componentTestsReaderColor(0) == first && componentTestsReaderColor(1) == second && Serial.output.empty(),
           "diagnostic pair changed or logged before 500ms");
      ++sim::now; loop();
      distinctPairOutputs(componentTestsReaderColor(0),componentTestsReaderColor(1));
      need(componentTestsReaderColor(0) != first && componentTestsReaderColor(1) != second,
           "diagnostic pair repeated one reader's colour");
      need(Serial.output.find("target=R1 colour=") != std::string::npos &&
           Serial.output.find("target=R2 colour=") != std::string::npos, "distinct random outputs lack per-reader labels");
    }
    sim::now = UINT32_MAX - 200; componentSerial(name); rgbUpdate();
    const RgbColor first = componentTestsReaderColor(0), second = componentTestsReaderColor(1);
    sim::now += 500; loop();
    distinctPairOutputs(componentTestsReaderColor(0),componentTestsReaderColor(1));
    need(componentTestsReaderColor(0) != first && componentTestsReaderColor(1) != second,
         "random pair stalled across millis rollover");
    sim::now += 5000; loop(); distinctPairOutputs(componentTestsReaderColor(0),componentTestsReaderColor(1));
    Serial.output.clear(); loop(); need(Serial.output.empty(), "late loop caused random catch-up logging");
    need(quizElapsedMs() == paused && quizState().score == 0 && fakeNvs == saved,
         "distinct random diagnostics changed time, score or NVS");
  }
}

static void calibration_random_rollover() {
  fixture(); sim::now = UINT32_MAX - 200; componentSerial("R2Random"); rgbUpdate();
  const RgbColor before = componentTestsReaderColor(1);
  advance(499); need(componentTestsReaderColor(1) == before, "RGB rollover changed colour early");
  advance(1); need(componentTestsReaderColor(1) != before, "RGB rollover stalled colour rotation");
  sim::now += 5000; loop(); const RgbColor late = componentTestsReaderColor(1);
  need(late != RgbColor::OFF, "delayed loop lost random output");
  Serial.output.clear(); loop(); need(Serial.output.empty(), "delayed loop caused random catch-up flood");
}

static void calibration_invalid_shortcuts() {
  fixture(); start(); const auto saved = fakeNvs;
  const char *bad[] = {"R1Red extra", "R2RGB extra", "R3Red", "R1Red/extra", "R2RGBx",
    "ButtonTest extra", "NEXTTest extra", "HINTTest extra", "test/led/r1/random/extra"};
  for (const char *line : bad) {
    componentSerial(line);
    need(!componentTestsActive() && appState().mode == AppMode::PLAY && fakeNvs == saved,
         "invalid calibration command changed game or registry");
  }
  componentSerial("R2Yellow"); advance(1);
  need(componentTestsActive(), "valid shortcut unavailable after invalid commands");
  for (const char *line : bad) {
    componentSerial(line); advance(1); componentOutputs(false,false,false,true,true,false);
  }
}

static void calibration_button_short_press() {
  const char *commands[] = {"NEXTTest", "HINTTest"};
  for (unsigned b = 0; b < 2; ++b) {
    fixture(); componentSerial(commands[b]);
    need(componentTestsActive(), "simple button test command did not start watch");
    // A bouncing press shorter than debounce never becomes a gesture.
    sim::pins[BUTTON_PINS[b]] = LOW; advance(20);
    sim::pins[BUTTON_PINS[b]] = HIGH; advance(50);
    need(Serial.output.find("event=SHORT_PRESS") == std::string::npos &&
         Serial.output.find("event=LONG_PRESS") == std::string::npos, "bounce classified as a gesture");
    Serial.output.clear(); sim::pins[BUTTON_PINS[b]] = LOW; advance(41);
    advance(159); sim::pins[BUTTON_PINS[b]] = HIGH; advance(41);
    const std::string name = b == 0 ? "NEXT GPIO32" : "HINT GPIO33";
    need(Serial.output.find(name + " event=SHORT_PRESS duration=200ms short=1 long=0") != std::string::npos,
         "short press missing, wrong duration or wrong button identity");
    componentSerial("test/button/status");
    need(Serial.output.find("short=1 long=0") != std::string::npos, "snapshot lost gesture counters");
    Serial.output.clear(); sim::pins[BUTTON_PINS[b]] = LOW; advance(41);
    advance(958); sim::pins[BUTTON_PINS[b]] = HIGH; advance(41);
    need(Serial.output.find(name + " event=SHORT_PRESS duration=999ms short=2 long=0") != std::string::npos &&
         Serial.output.find("event=LONG_PRESS") == std::string::npos, "999ms release was not a short press");
    Serial.output.clear(); sim::pins[BUTTON_PINS[1 - b]] = LOW; advance(1100);
    sim::pins[BUTTON_PINS[1 - b]] = HIGH; advance(41);
    need(Serial.output.empty() && !appState().showInstructions && appState().mode == AppMode::STOPPED,
         "unselected button produced calibration gestures or game actions");
  }
}

static void calibration_buttons_raw_held_entry() {
  fixture(); sim::pins[32] = LOW; componentSerial("ButtonTest");
  Serial.output.clear(); advance(1200);
  need(Serial.output.find("event=") == std::string::npos, "unsampled held button fabricated a gesture on entry");
  // A brief release bounce must not arm the held input.
  sim::pins[32] = HIGH; advance(20); sim::pins[32] = LOW; advance(1100);
  need(Serial.output.find("event=") == std::string::npos, "release bounce armed a held calibration button");
  sim::pins[32] = HIGH; advance(41);
  Serial.output.clear(); sim::pins[32] = LOW; advance(41); advance(159);
  sim::pins[32] = HIGH; advance(41);
  need(Serial.output.find("NEXT GPIO32 event=SHORT_PRESS duration=200ms short=1 long=0") != std::string::npos,
       "stable release did not arm a fresh calibration press");
}

static void calibration_button_long_boundary() {
  fixture(); componentSerial("ButtonTest");
  need(componentTestsActive(), "ButtonTest did not start diagnostics");
  for (unsigned b = 0; b < 2; ++b) {
    Serial.output.clear(); sim::pins[BUTTON_PINS[b]] = LOW; advance(41); advance(999);
    need(Serial.output.find("event=LONG_PRESS") == std::string::npos, "long press triggered before 1000ms");
    advance(1); const std::string name = b == 0 ? "NEXT GPIO32" : "HINT GPIO33";
    need(Serial.output.find(name + " event=LONG_PRESS duration=1000ms short=0 long=1") != std::string::npos,
         "long press did not trigger at 1000ms");
    Serial.output.clear(); advance(2200); need(Serial.output.empty(), "held long press repeated or flooded output");
    sim::pins[BUTTON_PINS[b]] = HIGH; advance(41);
    need(Serial.output.find(name + " event=RELEASE type=LONG duration=3241ms") != std::string::npos &&
         Serial.output.find("event=SHORT_PRESS") == std::string::npos &&
         Serial.output.find("event=LONG_PRESS") == std::string::npos, "long release double-counted or lost duration");
  }
  componentSerial("test/status");
  need(Serial.output.find("NEXT short=0 long=1 | HINT short=0 long=1") != std::string::npos,
       "status did not preserve both independent long counts");
  componentSerial("test/button/reset"); componentSerial("test/status");
  need(Serial.output.find("NEXT short=0 long=0 | HINT short=0 long=0") != std::string::npos,
       "button reset kept old short/long counters");
}

static void calibration_buttons_held_entry_and_rollover() {
  fixture(); sim::pins[32] = LOW; advance(41); componentSerial("ButtonTest");
  Serial.output.clear(); advance(1200); sim::pins[32] = HIGH; advance(41);
  need(Serial.output.find("event=") == std::string::npos, "button already held on entry fabricated a gesture");
  sim::now = UINT32_MAX - 200; sim::pins[32] = sim::pins[33] = LOW; advance(1041);
  need(Serial.output.find("NEXT GPIO32 event=LONG_PRESS duration=1000ms short=0 long=1") != std::string::npos &&
       Serial.output.find("HINT GPIO33 event=LONG_PRESS duration=1000ms short=0 long=1") != std::string::npos,
       "simultaneous long press or millis rollover broke gesture detection");
  componentSerial("test/stop"); advance(1000);
  need(!appState().showInstructions && appState().mode == AppMode::STOPPED,
       "long diagnostic press carried into game after exit");
  sim::pins[32] = sim::pins[33] = HIGH; advance(41);
  sim::pins[33] = LOW; advance(41);
  need(appState().showInstructions, "buttons remained disabled after stable release and fresh press");
}
