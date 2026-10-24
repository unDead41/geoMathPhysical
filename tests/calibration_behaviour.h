// Calibration tests use the UART, real debounce and real LED output adapter.
// A wrong alias target/colour, timer edge or duplicate gesture must fail here.
#include "hardware/component_tests.h"

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
  const char *commands[] = {"R1RGB", "R2RGB", "test/led/all/random"};
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
      componentOutputs(target != 1 && red, target != 1 && green, target != 1 && blue,
                       target != 0 && red, target != 0 && green, target != 0 && blue);
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

static void calibration_random_rollover() {
  fixture(); sim::now = UINT32_MAX - 200; componentSerial("R2RGB"); rgbUpdate();
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
