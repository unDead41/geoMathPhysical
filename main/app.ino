AppMode appMode = AppMode::STOPPED;
int8_t enrollReader = -1;
Shape enrollShape = Shape::NONE;
uint32_t enrollStarted = 0;
bool appShowInstructions = false;
uint8_t appInstructionPage = 0;

void appBegin() {
  appStop();
  Serial.println(F("[MENU] GeoDecoder: B1/NEXT untuk mula, B2/HINT untuk cara bermain."));
  if (!registryActiveReady())
    Serial.println(F("[SETUP] Daftar kad R1 dan R2 bagi jenis aktif, kemudian tekan NEXT."));
}

void appStop() {
  quizPauseClock();
  appMode = AppMode::STOPPED; enrollReader = -1; enrollShape = Shape::NONE;
  appShowInstructions = false;
  appInstructionPage = 0;
  rfidSetMode(ScanMode::STOPPED);
}

void appNextButton() {
  if (appMode == AppMode::PLAY) { quizNext(); return; }
  if (appMode != AppMode::STOPPED) {
    appStop(); // Keluar daripada imbasan guru / batalkan pendaftaran belum selesai.
    Serial.println(F("[MENU] Tekan NEXT untuk mula atau sambung permainan."));
    return;
  }
  if (appShowInstructions) return; // HINT perlu menamatkan semua halaman panduan.
  appPlay(true); // NEXT pada menu memulakan pusingan baharu.
}

void appHintButton() {
  if (appMode == AppMode::STOPPED) {
    if (!appShowInstructions) { appShowInstructions = true; appInstructionPage = 0; }
    else if (appInstructionPage + 1 < INSTRUCTION_PAGE_COUNT) ++appInstructionPage;
    else { appShowInstructions = false; appInstructionPage = 0; }
  }
  else if (appMode == AppMode::PLAY) {
    if (quiz.phase == QuizPhase::SUMMARY) appStop();
    else quizHint();
  }
}

bool appPlay(bool newRound) {
  if (!rfidGetRecord(0).online || !rfidGetRecord(1).online) {
    Serial.println(F("[ERROR] Kedua-dua RC522 mesti READY. Semak status, bekalan dan SPI.")); return false;
  }
  if (!registryActiveReady()) {
    Serial.println(F("[ERROR] UID R1 dan R2 bagi jenis aktif belum lengkap."));
    registryPrintActive(); return false;
  }
  if (newRound || quiz.phase != QuizPhase::QUESTION) {
    if (!quizStartRound()) return false;
  } else if (!quiz.advancePending && !quiz.awarded) {
    quizRetry(); // Imbasan penyelenggaraan tidak boleh dibawa masuk sebagai jawapan.
  }
  appMode = AppMode::PLAY; enrollReader = -1; enrollShape = Shape::NONE;
  appShowInstructions = false;
  appInstructionPage = 0;
  quizResumeClock();
  quizArmCurrentReader();
  Serial.println(F("[PLAY] Ikut LED, imbas SATU jawapan. NEXT=langkau; HINT=buka/tutup petunjuk."));
  return true;
}

void appInspect(ScanMode mode) {
  quizPauseClock();
  appMode = AppMode::UID_SCAN; enrollReader = -1; enrollShape = Shape::NONE;
  rfidSetMode(mode);
  Serial.println(F("[UID SCAN] Tiada pemarkahan. NEXT kembali ke menu; play sambung kuiz."));
}

bool appEnroll(uint8_t reader, Shape shape) {
  if (reader >= 2 || uint8_t(shape) >= SHAPE_COUNT || !rfidGetRecord(reader).online) {
    Serial.println(F("[ERROR] Jenis/reader tidak sah atau reader tidak READY.")); return false;
  }
  quizPauseClock();
  appMode = AppMode::ENROLL; enrollReader = int8_t(reader); enrollShape = shape;
  enrollStarted = millis();
  rfidSetMode(reader == 0 ? ScanMode::R1 : ScanMode::R2);
  Serial.printf("[ASSIGN] Imbas kad %s %s di R%u. Baki 30s; stop untuk batal.\n",
                reader == 0 ? "bongkah" : "bentangan", shapeName(shape), unsigned(reader + 1));
  return true;
}

void appConfigurationChanged() {
  appStop(); quizDiscard();
  Serial.println(F("[CONFIG] Disimpan. Round lama dikosongkan; tekan NEXT atau taip play untuk mula."));
}

void appHandleScan(uint8_t reader, const Uid &uid) {
  if (reader >= 2) return;
  if (appMode == AppMode::PLAY) quizOnScan(reader, uid);
  else if (appMode == AppMode::ENROLL && reader == uint8_t(enrollReader)) {
    if (registryAssign(reader, enrollShape, uid)) appConfigurationChanged();
    // Kad pendua/gagal NVS tidak disimpan. Tunggu kad lain sehingga timeout.
  }
}

void appUpdate() {
  quizUpdate();
  if (appMode == AppMode::ENROLL && uint32_t(millis() - enrollStarted) >= ENROLL_TIMEOUT_MS) {
    appStop();
    Serial.println(F("[TIMEOUT] Pendaftaran dibatalkan; tiada UID baharu disimpan."));
  }
}
