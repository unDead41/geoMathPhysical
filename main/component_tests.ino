#include "hardware/component_tests.h"
#include "hardware/rfid.h"
#include "hardware/buttons.h"
#include "application/app.h"
#include "domain/rgb_random.h"
#include "config.h"
#include <cstring>
#include <cstdio>

namespace {
enum class ComponentMode : uint8_t { NONE, RFID, LED, BUTTON };
enum class ComponentPattern : uint8_t { STEADY, CYCLE, BLINK, RANDOM };
struct ComponentSession {
  ComponentMode mode;
  uint8_t selected;
  RgbColor colour;
  RgbColor randomColours[READER_COUNT];
  ComponentPattern pattern;
  uint32_t startedMs;
  bool lastRaw[2], lastStable[2], buttonReady[2];
  uint32_t rawChangedMs[2];
  uint32_t presses[2];
  bool pressActive[2], longReported[2];
  uint32_t pressedMs[2], shortPresses[2], longPresses[2];
  uint8_t lastStep;
};
ComponentSession componentSession = {};
constexpr uint16_t COMPONENT_CYCLE_MS = 500, COMPONENT_BLINK_MS = 250;
constexpr uint16_t COMPONENT_LONG_PRESS_MS = 1000;
const RgbColor componentPalette[] = {RgbColor::RED, RgbColor::GREEN, RgbColor::BLUE,
  RgbColor::YELLOW, RgbColor::CYAN, RgbColor::MAGENTA, RgbColor::WHITE};
const char *const componentColourNames[] = {"off", "blue", "green", "red", "yellow", "cyan", "magenta", "white"};

const char *componentModeName() {
  switch (componentSession.mode) {
    case ComponentMode::RFID: return "RFID";
    case ComponentMode::LED: return "LED";
    case ComponentMode::BUTTON: return "BUTTON";
    case ComponentMode::NONE: return "NONE";
  }
  return "NONE";
}
const char *componentTargetName() {
  return componentSession.selected == 1 ? "R1" : componentSession.selected == 2 ? "R2" : "ALL";
}
bool componentSelected(uint8_t index) {
  return index < 2 && (componentSession.selected & (1U << index));
}
uint8_t componentRandomIndex(uint8_t count) { return uint8_t(random(count)); }
void componentPickRandomColours() {
  for (uint8_t reader = 0; reader < READER_COUNT; ++reader) if (componentSelected(reader))
    componentSession.randomColours[reader] = pickRandomRgbColor(componentSession.randomColours[reader],
      reader ? componentSession.randomColours[0] : RgbColor::OFF, componentRandomIndex);
}
void componentPrintRandomColours() {
  for (uint8_t reader = 0; reader < READER_COUNT; ++reader) if (componentSelected(reader))
    Serial.printf("[TEST LED] target=R%u colour=%s\n", unsigned(reader + 1),
      componentColourNames[uint8_t(componentSession.randomColours[reader])]);
}
void componentError() { Serial.println(F("[TEST ERROR] Arahan ujian tidak sah. Taip test/help.")); }
void componentHelp() {
  Serial.println(F(
    "\n--- UJIAN KOMPONEN / SERIAL 115200 ---\n"
    "test/help                  : senarai arahan ujian\n"
    "test/status                : sesi ujian aktif\n"
    "test/stop                  : tamat ujian, kembali menu (alias stop)\n"
    "test/rfid/status           : status boot/probe terakhir, tanpa ubah sesi\n"
    "test/rfid/check            : semak SPI/versi terkini, kemudian imbas kedua-dua\n"
    "test/rfid/r1               : baca UID di R1 sahaja\n"
    "test/rfid/r2               : baca UID di R2 sahaja\n"
    "test/rfid/all              : baca UID kedua-dua reader (alias scan)\n"
    "test/led/r1/red            : merah pada RGB1 sahaja\n"
    "test/led/r2/green          : hijau pada RGB2 sahaja\n"
    "test/led/all/blue          : biru pada kedua-dua RGB\n"
    "test/led/off               : kedua-dua padam sehingga test/stop\n"
    "test/led/cycle             : 7 warna, 500ms setiap warna\n"
    "test/led/random            : R1/R2 rawak berlainan, tukar setiap 500ms\n"
    "test/led/blink             : putih 250ms ON + 250ms OFF\n"
    "R1Red R1Green R1Blue R1Yellow R1Cyan R1Magenta R1Purple R1White R1Off\n"
    "R2Red R2Green R2Blue R2Yellow R2Cyan R2Magenta R2Purple R2White R2Off\n"
    "R1RGB/R2RGB = semua 7 warna mengikut turutan, 500ms setiap warna.\n"
    "R1Random/R2Random = warna rawak, 500ms setiap warna.\n"
    "Warna: red green blue yellow cyan magenta/purple white off.\n"
    "Purple = ungu (merah+biru), sama seperti Magenta; warna hint permainan.\n"
    "Target LED: r1, r2, all; jika ditinggalkan, kedua-duanya.\n"
    "test/button/status         : status raw + debounce sekali\n"
    "test/button/all            : pantau NEXT dan HINT\n"
    "test/button/next           : pantau NEXT sahaja\n"
    "test/button/hint           : pantau HINT sahaja\n"
    "test/button/reset          : kosongkan kiraan, pantau kedua-dua\n"
    "ButtonTest / NEXTTest / HINTTest : alias watch kedua-dua/NEXT/HINT\n"
    "SHORT_PRESS <1000ms pada lepas; LONG_PRESS >=1000ms sekali ketika tahan.\n"
    "Permainan/masa dijeda semasa ujian; tiada markah atau pendaftaran UID.\n"
    "Baca status/pins/help semasa ujian; test/stop sebelum arahan lain.\n"
    "LED biasa hanya ON/OFF; gunakan esp32dev-rgb untuk warna.\n"));
}
void componentPrintStatus() {
  Serial.printf("[TEST STATUS] mode=%s target=%s B1=%lu B2=%lu\n", componentModeName(),
    componentTargetName(), static_cast<unsigned long>(componentSession.presses[0]),
    static_cast<unsigned long>(componentSession.presses[1]));
  Serial.printf("[TEST BUTTON COUNTS] NEXT short=%lu long=%lu | HINT short=%lu long=%lu\n",
    static_cast<unsigned long>(componentSession.shortPresses[0]), static_cast<unsigned long>(componentSession.longPresses[0]),
    static_cast<unsigned long>(componentSession.shortPresses[1]), static_cast<unsigned long>(componentSession.longPresses[1]));
}
void componentPrintRfidStatus() {
  Serial.println(F("[TEST RFID] Status tersimpan daripada boot/probe terakhir; UID menguji bacaan kad."));
  for (uint8_t i = 0; i < 2; ++i) {
    const ReaderRecord &record = rfidGetRecord(i);
    Serial.printf("R%u firmware=0x%02X %s | SS=%u RST=%u\n", unsigned(i + 1),
      unsigned(record.version), record.online ? "READY" : "NOT FOUND",
      unsigned(RFID_SS_PINS[i]), unsigned(RFID_RST_PIN));
  }
}
void componentPrintButton(uint8_t index) {
  Serial.printf("[TEST BUTTON] %s GPIO%u raw=%s stable=%s count=%lu short=%lu long=%lu\n",
    index == 0 ? "NEXT" : "HINT", unsigned(BUTTON_PINS[index]),
    digitalRead(BUTTON_PINS[index]) == LOW ? "LOW" : "HIGH",
    buttonIsPressed(index) ? "TEKAN" : "LEPAS", static_cast<unsigned long>(componentSession.presses[index]),
    static_cast<unsigned long>(componentSession.shortPresses[index]), static_cast<unsigned long>(componentSession.longPresses[index]));
}
void componentPrintGesture(uint8_t index, const char *event, uint32_t duration) {
  Serial.printf("[TEST BUTTON] %s GPIO%u event=%s duration=%lums short=%lu long=%lu\n",
    index == 0 ? "NEXT" : "HINT", unsigned(BUTTON_PINS[index]), event, static_cast<unsigned long>(duration),
    static_cast<unsigned long>(componentSession.shortPresses[index]), static_cast<unsigned long>(componentSession.longPresses[index]));
}
void componentIncrement(uint32_t &count) {
  if (count < UINT32_MAX) ++count;
}
void componentEnter(ComponentMode mode, uint8_t selected) {
  appStop(); // Pause clock, cancel enrolment and stop reader fields without changing registry.
  buttonsRequireRelease();
  componentSession = {};
  componentSession.mode = mode; componentSession.selected = selected;
  componentSession.startedMs = millis(); componentSession.lastStep = 255;
  for (uint8_t i = 0; i < 2; ++i) {
    componentSession.lastRaw[i] = digitalRead(BUTTON_PINS[i]);
    componentSession.lastStable[i] = buttonIsPressed(i);
    componentSession.rawChangedMs[i] = millis();
    componentSession.buttonReady[i] = !componentSession.lastStable[i] &&
      componentSession.lastRaw[i] != BUTTON_PRESSED_LEVEL[i];
  }
}
bool componentParseColour(const char *text, RgbColor &out) {
  if (!strcmp(text, "purple")) { out = RgbColor::MAGENTA; return true; }
  for (uint8_t i = 0; i < sizeof(componentColourNames) / sizeof(componentColourNames[0]); ++i) {
    if (!strcmp(text, componentColourNames[i])) { out = RgbColor(i); return true; }
  }
  return false;
}
void componentStartRfid(uint8_t selected, bool check) {
  componentEnter(ComponentMode::RFID, selected);
  if (check) rfidCheckConnections();
  rfidSetMode(selected == 1 ? ScanMode::R1 : selected == 2 ? ScanMode::R2 : ScanMode::BOTH);
  componentPrintRfidStatus();
  Serial.printf("[TEST RFID] mode=%s. Imbas/angkat kad; UID di Serial, tiada markah. test/stop untuk keluar.\n",
                componentTargetName());
}
void componentStartLed(uint8_t selected, ComponentPattern pattern, RgbColor colour) {
  componentEnter(ComponentMode::LED, selected);
  componentSession.pattern = pattern; componentSession.colour = colour;
  if (pattern == ComponentPattern::RANDOM) componentPickRandomColours();
  Serial.printf("[TEST LED] target=%s action=%s. test/stop untuk keluar.\n", componentTargetName(),
    pattern == ComponentPattern::CYCLE ? "cycle" : pattern == ComponentPattern::BLINK ? "blink" :
    pattern == ComponentPattern::RANDOM ? "random" : componentColourNames[uint8_t(colour)]);
  if (pattern == ComponentPattern::RANDOM) componentPrintRandomColours();
  if (!RGB_ENABLED) Serial.println(F("[TEST LED] LED BIASA: warna menjadi ON/OFF; warna RGB memerlukan esp32dev-rgb."));
}
void componentStartButtons(uint8_t selected) {
  componentEnter(ComponentMode::BUTTON, selected);
  Serial.println(F("[TEST BUTTON] SHORT_PRESS <1000ms; LONG_PRESS >=1000ms sekali semasa tahan. Masa selepas debounce; test/stop untuk keluar."));
  for (uint8_t i = 0; i < 2; ++i) if (componentSelected(i)) componentPrintButton(i);
}
void componentPutRow(LcdFrame &frame, uint8_t row, const char *text) {
  size_t n = strlen(text); if (n > 20) n = 20;
  memcpy(frame.rows[row], text, n);
}
} // namespace

void componentTestsBegin() { componentSession = {}; }
bool componentTestsActive() { return componentSession.mode != ComponentMode::NONE; }
void componentTestsStop() {
  if (!componentTestsActive()) return;
  componentSession.mode = ComponentMode::NONE;
  buttonsRequireRelease(); // Includes raw presses not yet seen by buttonsUpdate().
  appStop();
  Serial.println(F("[TEST STOP] Ujian tamat. Menu utama; lepaskan butang sebelum bermain."));
}

bool componentTestsShortcut(const char *name) {
  if (!name) return false;
  const uint8_t buttons = !strcmp(name, "buttontest") ? 3 : !strcmp(name, "nexttest") ? 1 :
    !strcmp(name, "hinttest") ? 2 : 0;
  if (buttons) { componentStartButtons(buttons); return true; }
  const uint8_t selected = !strncmp(name, "r1", 2) ? 1 : !strncmp(name, "r2", 2) ? 2 : 0;
  if (!selected) return false;
  const char *action = name + 2; RgbColor colour = RgbColor::OFF;
  if (!strcmp(action, "rgb")) { componentStartLed(selected, ComponentPattern::CYCLE, colour); return true; }
  if (!strcmp(action, "random")) { componentStartLed(selected, ComponentPattern::RANDOM, colour); return true; }
  if (componentParseColour(action, colour)) { componentStartLed(selected, ComponentPattern::STEADY, colour); return true; }
  return false;
}

void componentTestsCommand(const char *path) {
  // Strict bounded parser: reject empty segments/trailing slashes/extra components
  // before changing any session or touching hardware.
  char buffer[80];
  if (!path || strlen(path) >= sizeof(buffer)) { componentError(); return; }
  strcpy(buffer, path);
  char *parts[5] = {buffer}; uint8_t count = 1;
  for (char *p = buffer; *p; ++p) if (*p == '/') {
    if (p == buffer || p[-1] == '\0' || !p[1] || count == 5) { componentError(); return; }
    *p = '\0'; parts[count++] = p + 1;
  }
  if (strcmp(parts[0], "test")) { componentError(); return; }
  if (count == 1 || (count == 2 && !strcmp(parts[1], "help"))) { componentHelp(); return; }
  if (count == 2 && !strcmp(parts[1], "stop")) { componentTestsStop(); return; }
  if (count == 2 && !strcmp(parts[1], "status")) { componentPrintStatus(); return; }
  const bool rfid = !strcmp(parts[1], "rfid"), led = !strcmp(parts[1], "led"), button = !strcmp(parts[1], "button");
  if ((rfid || led || button) && (count == 2 || (count == 3 && !strcmp(parts[2], "help")))) {
    componentHelp(); return;
  }
  if (rfid && count == 3) {
    if (!strcmp(parts[2], "status")) { componentPrintRfidStatus(); return; }
    if (!strcmp(parts[2], "check")) { componentStartRfid(3, true); return; }
    const uint8_t selected = !strcmp(parts[2], "r1") ? 1 : !strcmp(parts[2], "r2") ? 2 :
      (!strcmp(parts[2], "all") || !strcmp(parts[2], "scan")) ? 3 : 0;
    if (selected) { componentStartRfid(selected, false); return; }
  }
  if (led && (count == 3 || count == 4)) {
    const uint8_t selected = count == 3 ? 3 : !strcmp(parts[2], "r1") ? 1 : !strcmp(parts[2], "r2") ? 2 :
      !strcmp(parts[2], "all") ? 3 : 0;
    const char *action = parts[count - 1]; RgbColor colour = RgbColor::OFF;
    if (selected && !strcmp(action, "random")) { componentStartLed(selected, ComponentPattern::RANDOM, colour); return; }
    if (selected && !strcmp(action, "cycle")) { componentStartLed(selected, ComponentPattern::CYCLE, colour); return; }
    if (selected && !strcmp(action, "blink")) { componentStartLed(selected, ComponentPattern::BLINK, colour); return; }
    if (selected && componentParseColour(action, colour)) { componentStartLed(selected, ComponentPattern::STEADY, colour); return; }
  }
  if (button && count == 3) {
    if (!strcmp(parts[2], "status")) { for (uint8_t i = 0; i < 2; ++i) componentPrintButton(i); return; }
    const uint8_t selected = !strcmp(parts[2], "next") ? 1 : !strcmp(parts[2], "hint") ? 2 :
      (!strcmp(parts[2], "all") || !strcmp(parts[2], "reset")) ? 3 : 0;
    if (selected) { componentStartButtons(selected); return; }
  }
  componentError();
}

void componentTestsUpdate() {
  const uint32_t now = millis();
  if (componentSession.mode == ComponentMode::BUTTON) {
    for (uint8_t i = 0; i < 2; ++i) if (componentSelected(i)) {
      const bool raw = digitalRead(BUTTON_PINS[i]), stable = buttonIsPressed(i);
      if (raw != componentSession.lastRaw[i]) componentSession.rawChangedMs[i] = now;
      if (!stable && raw != BUTTON_PRESSED_LEVEL[i] &&
          uint32_t(now - componentSession.rawChangedMs[i]) >= BUTTON_DEBOUNCE_MS)
        componentSession.buttonReady[i] = true;
      if (stable && !componentSession.lastStable[i] && componentSession.buttonReady[i]) {
        componentIncrement(componentSession.presses[i]);
        componentSession.buttonReady[i] = false;
        componentSession.pressActive[i] = true; componentSession.longReported[i] = false;
        componentSession.pressedMs[i] = now;
      }
      // A button held before entry must be released before it can start a gesture.
      if (componentSession.pressActive[i]) {
        const uint32_t duration = uint32_t(now - componentSession.pressedMs[i]);
        if (!componentSession.longReported[i] && duration >= COMPONENT_LONG_PRESS_MS) {
          componentSession.longReported[i] = true; componentIncrement(componentSession.longPresses[i]);
          componentPrintGesture(i, "LONG_PRESS", duration);
        }
        if (!stable) {
          if (!componentSession.longReported[i]) {
            componentIncrement(componentSession.shortPresses[i]); componentPrintGesture(i, "SHORT_PRESS", duration);
          } else componentPrintGesture(i, "RELEASE type=LONG", duration);
          componentSession.pressActive[i] = false;
        }
      }
      if (raw == componentSession.lastRaw[i] && stable == componentSession.lastStable[i]) continue;
      componentSession.lastRaw[i] = raw; componentSession.lastStable[i] = stable;
      componentPrintButton(i);
    }
  } else if (componentSession.mode == ComponentMode::LED && componentSession.pattern == ComponentPattern::RANDOM) {
    const uint32_t elapsed = uint32_t(now - componentSession.startedMs);
    if (elapsed < COMPONENT_CYCLE_MS) return;
    componentSession.startedMs += (elapsed / COMPONENT_CYCLE_MS) * COMPONENT_CYCLE_MS;
    componentPickRandomColours();
    componentPrintRandomColours();
  } else if (componentSession.mode == ComponentMode::LED && componentSession.pattern != ComponentPattern::STEADY) {
    const bool cycle = componentSession.pattern == ComponentPattern::CYCLE;
    const uint8_t step = uint8_t((uint32_t(now - componentSession.startedMs) /
      (cycle ? COMPONENT_CYCLE_MS : COMPONENT_BLINK_MS)) % (cycle ? 7U : 2U));
    if (step == componentSession.lastStep) return;
    componentSession.lastStep = step;
    const RgbColor colour = cycle ? componentPalette[step] : step ? RgbColor::OFF : RgbColor::WHITE;
    Serial.printf("[TEST LED] target=%s colour=%s\n", componentTargetName(), componentColourNames[uint8_t(colour)]);
  }
}
RgbColor componentTestsReaderColor(uint8_t reader) {
  if (!componentSelected(reader)) return RgbColor::OFF;
  switch (componentSession.mode) {
    case ComponentMode::RFID: return rfidGetRecord(reader).online ? RgbColor::BLUE : RgbColor::RED;
    case ComponentMode::BUTTON: return buttonIsPressed(reader) ? RgbColor::GREEN : RgbColor::OFF;
    case ComponentMode::LED:
      if (componentSession.pattern == ComponentPattern::CYCLE)
        return componentPalette[(uint32_t(millis() - componentSession.startedMs) / COMPONENT_CYCLE_MS) % 7U];
      if (componentSession.pattern == ComponentPattern::BLINK)
        return (uint32_t(millis() - componentSession.startedMs) / COMPONENT_BLINK_MS) % 2U ? RgbColor::OFF : RgbColor::WHITE;
      if (componentSession.pattern == ComponentPattern::RANDOM) return componentSession.randomColours[reader];
      return componentSession.colour;
    case ComponentMode::NONE: return RgbColor::OFF;
  }
  return RgbColor::OFF;
}
LcdFrame componentTestsLcdFrame() {
  LcdFrame frame; memset(frame.rows, ' ', sizeof(frame.rows));
  for (uint8_t row = 0; row < 4; ++row) frame.rows[row][20] = '\0';
  componentPutRow(frame, 0, "UJIAN KOMPONEN");
  char title[21]; snprintf(title, sizeof(title), "%s: %s", componentModeName(), componentTargetName());
  componentPutRow(frame, 1, title);
  componentPutRow(frame, 2, componentSession.mode == ComponentMode::RFID ? "Imbas kad pada RFID" :
    componentSession.mode == ComponentMode::BUTTON ? "<1s SHORT >=1s LONG" : "Periksa warna LED");
  componentPutRow(frame, 3, "Keluar: test/stop");
  return frame;
}
