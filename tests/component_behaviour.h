// Real Serial and adapter paths; only electrical I/O is simulated.
static void componentSerial(const char *line) {
  Serial.output.clear();
  for (char c : std::string(line) + "\n") Serial.input.push_back(c);
  while (Serial.available()) serialUpdate();
}
static void componentOutputs(bool r1, bool g1, bool b1, bool r2, bool g2, bool b2) {
#if GEODECODER_RGB_ENABLED
  need(sim::pins[13] == int(r1) && sim::pins[14] == int(g1) && sim::pins[25] == int(b1) &&
       sim::pins[16] == int(r2) && sim::pins[17] == int(g2) && sim::pins[26] == int(b2),
       "diagnostic output is wrong or overridden by the game");
#else
  need(sim::pins[25] == int(r1 || g1 || b1) && sim::pins[26] == int(r2 || g2 || b2),
       "ordinary diagnostic LEDs are wrong or overridden");
#endif
}
static void componentCard(unsigned reader, const Uid &uid) {
  sim::cards[reader].present = true; sim::cards[reader].size = uid.size;
  memcpy(sim::cards[reader].bytes, uid.bytes, sizeof(uid.bytes));
}
static void component_help_and_uart() {
  fixture(); componentSerial("test/help");
  need(Serial.output.find("test/rfid/r1") != std::string::npos &&
       Serial.output.find("test/led/r1/red") != std::string::npos &&
       Serial.output.find("test/button/all") != std::string::npos,
       "Serial component command discovery missing");
  start(); const uint32_t elapsed = quizElapsedMs();
  componentSerial("test/rfid");
  need(appState().mode == AppMode::PLAY && quizElapsedMs() == elapsed, "category help changed game");
  componentSerial("  TEST/LED/R1/BLUE  "); advance(1);
  need(appState().mode == AppMode::STOPPED, "test did not pause play");
  componentOutputs(false, false, true, false, false, false);
  componentSerial("test/status");
  need(Serial.output.find("mode=LED") != std::string::npos, "test status did not identify active session");
  lcdUpdate(); need(std::string(sim::lcdCells[0]).find("UJIAN KOMPONEN") != std::string::npos,
                    "LCD still looks like a playable game during test");
}
static void component_led_ownership() {
  fixture(); start(); const auto saved = fakeNvs; const uint32_t paused = quizElapsedMs();
  componentSerial("test/led/r1/red"); advance(1200);
  componentOutputs(true, false, false, false, false, false);
  need(quizElapsedMs() == paused && quizState().score == 0 && rfidGetMode() == ScanMode::STOPPED,
       "LED test ran timer or left readers active");
  componentSerial("test/led/r2/blue"); advance(1001);
  componentOutputs(false, false, false, false, false, true);
  componentSerial("test/led/off"); advance(1100);
  componentOutputs(false, false, false, false, false, false);
  need(fakeNvs == saved, "component test modified registered cards");
  componentSerial("test/stop"); advance(1);
  need(appState().mode == AppMode::STOPPED && quizElapsedMs() == paused, "test exit resumed game");
  lcdUpdate(); need(std::string(sim::lcdCells[0]).find("GeoDecoder") != std::string::npos, "test exit did not restore menu");
  command("play"); advance(200);
  need(appState().mode == AppMode::PLAY && quizElapsedMs() == paused + 200, "play after diagnostics counted test time");
}
static void component_led_timing() {
  fixture(); componentSerial("test/led/all/cycle"); advance(1);
  componentOutputs(true, false, false, true, false, false);
  advance(498); componentOutputs(true, false, false, true, false, false);
  advance(1); componentOutputs(false, true, false, false, true, false);
  advance(500); componentOutputs(false, false, true, false, false, true);
  advance(500); componentOutputs(true, true, false, true, true, false);
  advance(500); componentOutputs(false, true, true, false, true, true);
  advance(500); componentOutputs(true, false, true, true, false, true);
  advance(500); componentOutputs(true, true, true, true, true, true);
  advance(500); componentOutputs(true, false, false, true, false, false);
  componentSerial("test/led/blink"); advance(249);
  componentOutputs(true, true, true, true, true, true);
  advance(1); componentOutputs(false, false, false, false, false, false);
  advance(249); componentOutputs(false, false, false, false, false, false);
  advance(1); componentOutputs(true, true, true, true, true, true);
}
static void component_rfid_watch() {
  const char *commands[] = {"test/rfid/r1", "test/rfid/r2", "test/rfid/all"};
  for (unsigned selected = 0; selected < 3; ++selected) {
    fixture(); start(); const auto saved = fakeNvs; const uint32_t paused = quizElapsedMs();
    componentSerial(commands[selected]);
    need(rfidGetMode() == (selected == 0 ? ScanMode::R1 : selected == 1 ? ScanMode::R2 : ScanMode::BOTH),
         "diagnostic RFID command selected wrong reader");
    const Uid unknown = {4, {4, 0xDD, 0xCC, 0xBB}};
    componentCard(0, tag(Shape::CUBE, 0)); componentCard(1, unknown); advance(300);
    const unsigned n0 = selected == 1 ? 0 : 1, n1 = selected == 0 ? 0 : 1;
    need(rfidGetRecord(0).count == n0 && rfidGetRecord(1).count == n1, "RFID test did not deliver selected UIDs");
    need(Serial.output.find("UID:") != std::string::npos, "RFID test did not print UID");
    if (n1) need(Serial.output.find("04 DD CC BB") != std::string::npos, "unknown card was not readable in diagnostics");
    advance(500); need(rfidGetRecord(0).count == n0 && rfidGetRecord(1).count == n1, "held diagnostic card floods serial");
    sim::cards[0].present = sim::cards[1].present = false; advance(300);
    sim::cards[0].present = sim::cards[1].present = true; advance(300);
    need(rfidGetRecord(0).count == n0 * 2 && rfidGetRecord(1).count == n1 * 2, "RFID test did not detect rescans");
    need(appState().mode == AppMode::STOPPED && quizState().score == 0 && quizElapsedMs() == paused && fakeNvs == saved,
         "RFID diagnostics scored, ran time or registered a card");
    componentSerial("test/stop"); advance(500);
    need(rfidGetMode() == ScanMode::STOPPED && rfidGetRecord(0).count == n0 * 2,
         "RFID diagnostic still scanning after exit");
  }
}
static void component_rfid_health() {
  fixture(); sim::versions[0] = 0; sim::versions[1] = 0xFF;
  componentSerial("test/rfid/check");
  need(!rfidGetRecord(0).online && !rfidGetRecord(1).online, "RFID check used stale boot status");
  need(Serial.output.find("0x00 NOT FOUND") != std::string::npos &&
       Serial.output.find("0xFF NOT FOUND") != std::string::npos, "disconnected RFID status missing");
  sim::versions[0] = 0x92; sim::versions[1] = 0x91; componentSerial("test/rfid/check");
  need(rfidGetRecord(0).online && rfidGetRecord(1).online && rfidGetMode() == ScanMode::BOTH,
       "RFID connection check did not refresh/recover readers");
  need(Serial.output.find("0x91 READY") != std::string::npos, "new firmware version not reported");
}
static void component_button_watch() {
  fixture(); componentSerial("test/button/next");
  sim::pins[32] = LOW; advance(39);
  need(Serial.output.find("count=1") == std::string::npos, "button test counted bounce before debounce");
  advance(2); need(Serial.output.find("NEXT GPIO32 raw=LOW stable=TEKAN count=1") != std::string::npos,
                   "button test did not report real debounced press");
  Serial.output.clear(); advance(800);
  need(Serial.output.empty(), "held button floods diagnostics");
  sim::pins[32] = HIGH; advance(41);
  need(Serial.output.find("stable=LEPAS count=1") != std::string::npos, "release missing in button diagnostics");
  Serial.output.clear(); sim::pins[33] = LOW; advance(41);
  need(Serial.output.empty() && !appState().showInstructions && appState().mode == AppMode::STOPPED,
       "unselected button changed game/tutorial or leaked into selected watch");
  sim::pins[33] = HIGH; advance(41); componentSerial("test/button/all");
  sim::pins[33] = LOW; advance(41);
  need(Serial.output.find("HINT GPIO33 raw=LOW stable=TEKAN count=1") != std::string::npos, "HINT watcher missing");
  componentSerial("test/button/reset"); componentSerial("test/status");
  need(Serial.output.find("B2=0") != std::string::npos, "button reset did not clear press count");
}
static void component_exit_drops_buttons() {
  for (unsigned button = 0; button < 2; ++button) {
    fixture(); componentSerial("test/button/all");
    // Raw press starts immediately before serial exit, before buttonsUpdate samples it.
    sim::pins[BUTTON_PINS[button]] = LOW; componentSerial("test/stop"); advance(1000);
    need(appState().mode == AppMode::STOPPED && !appState().showInstructions,
         "button pressed during diagnostics carried into menu/game");
    sim::pins[BUTTON_PINS[button]] = HIGH; advance(41);
    sim::pins[BUTTON_PINS[button]] = LOW; advance(41);
    need(button == 0 ? appState().mode == AppMode::PLAY : appState().showInstructions,
         "fresh press after diagnostic exit was suppressed forever");
  }
}
static void component_invalid_paths_and_gates() {
  fixture(); start(); const uint32_t elapsed = quizElapsedMs();
  const char *bad[] = {"test/led/r3/red", "test//led/red", "test/led//red", "test/led/r1/",
    "test/led/r1/red/extra", "test/rfid/r9", "test/button/foo", "test/led/red extra", "test/status extra"};
  for (const char *line : bad) {
    componentSerial(line);
    need(Serial.output.find("[TEST ERROR]") != std::string::npos, "bad test path was not rejected clearly");
    need(appState().mode == AppMode::PLAY && quizElapsedMs() == elapsed, "invalid path changed active game");
  }
  componentSerial("test/led/r1/red"); const auto saved = fakeNvs;
  for (const char *line : bad) { componentSerial(line); advance(1); componentOutputs(true, false, false, false, false, false); }
  componentSerial("stop extra"); advance(1);
  componentOutputs(true, false, false, false, false, false);
  const char *blocked[] = {"next", "hint", "play", "round new", "assign r1 kubus 04 A1 B2 C3", "check uid",
    "unassign all", "unassign kubus", "unassign r1 kubus"};
  for (const char *line : blocked) {
    componentSerial(line); advance(1);
    need(appState().mode == AppMode::STOPPED && !appState().showInstructions && fakeNvs == saved,
         "normal command escaped diagnostic isolation");
    componentOutputs(true, false, false, false, false, false);
  }
  componentSerial("help"); need(Serial.output.find("test/help") != std::string::npos, "normal help does not advertise tests");
  componentSerial("pins"); componentSerial("status"); advance(1);
  componentOutputs(true, false, false, false, false, false);
  componentSerial("stop"); command("check uid 2");
  need(appState().mode == AppMode::UID_SCAN && rfidGetMode() == ScanMode::R2, "teacher commands broken after diagnostic exit");
}
static void component_switch_and_rollover() {
  fixture(); componentSerial("test/rfid/all"); advance(1);
  componentSerial("test/button/hint"); need(rfidGetMode() == ScanMode::STOPPED, "switching tests left RFID active");
  componentSerial("test/led/r2/green"); advance(1);
  componentOutputs(false, false, false, false, true, false);
  sim::now = UINT32_MAX - 250; componentSerial("test/led/cycle"); advance(500);
  componentOutputs(false, true, false, false, true, false);
  sim::now = UINT32_MAX - 100; componentSerial("test/led/blink"); advance(250);
  componentOutputs(false, false, false, false, false, false);
  componentSerial("test/stop"); command("play"); advance(500);
  need(appState().mode == AppMode::PLAY && quizState().score == 0, "diagnostics did not relinquish control");
}
