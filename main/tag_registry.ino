// Mapping disimpan di ESP32, bukan menulis data atau menukar UID kad RFID.
RegistryData registryData = {};
bool registryStorageReady = false;
Preferences registryPreferences;
constexpr uint32_t REGISTRY_MAGIC = 0x474D5132;
constexpr uint16_t REGISTRY_VERSION = 1;

const char *shapeName(Shape shape) {
  static const char *const names[] = {"kubus", "piramid", "silinder", "kon", "kuboid"};
  return uint8_t(shape) < SHAPE_COUNT ? names[uint8_t(shape)] : "tidak_dikenali";
}

const char *shapeLabel(Shape shape) {
  static const char *const labels[] = {"KUBUS", "PIRAMID S4 SAMA", "SILINDER", "KON", "KUBOID"};
  return uint8_t(shape) < SHAPE_COUNT ? labels[uint8_t(shape)] : "--";
}

Shape shapeFromName(const char *name) {
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if (!strcmp(name, shapeName(Shape(s)))) return Shape(s);
  if (!strcmp(name, "cube")) return Shape::CUBE;
  if (!strcmp(name, "pyramid")) return Shape::PYRAMID;
  if (!strcmp(name, "cylinder")) return Shape::CYLINDER;
  if (!strcmp(name, "cone")) return Shape::CONE;
  if (!strcmp(name, "cuboid")) return Shape::CUBOID;
  return Shape::NONE;
}

uint8_t shapeBit(Shape shape) {
  return uint8_t(shape) < SHAPE_COUNT ? uint8_t(1U << uint8_t(shape)) : 0;
}

uint8_t maskCount(uint8_t mask) {
  uint8_t n = 0;
  while (mask) { n += mask & 1U; mask >>= 1; }
  return n;
}

bool uidValid(const Uid &uid) { return uid.size == 4 || uid.size == 7 || uid.size == 10; }
bool uidEqual(const Uid &a, const Uid &b) {
  return uidValid(a) && a.size == b.size && memcmp(a.bytes, b.bytes, a.size) == 0;
}

bool uidParse(const char *text, Uid &out) {
  if (!text) return false;
  Uid parsed = {};
  int high = -1;
  for (const unsigned char *p = reinterpret_cast<const unsigned char *>(text); *p; ++p) {
    if (*p == ' ' || *p == '\t' || *p == ':' || *p == '-') continue;
    int value;
    if (*p >= '0' && *p <= '9') value = *p - '0';
    else if (*p >= 'a' && *p <= 'f') value = *p - 'a' + 10;
    else if (*p >= 'A' && *p <= 'F') value = *p - 'A' + 10;
    else return false;
    if (high < 0) high = value;
    else {
      if (parsed.size >= sizeof(parsed.bytes)) return false;
      parsed.bytes[parsed.size++] = uint8_t(high * 16 + value);
      high = -1;
    }
  }
  if (high >= 0 || !uidValid(parsed)) return false;
  out = parsed;
  return true;
}

void uidFormat(const Uid &uid, char *out, size_t capacity, bool spaced) {
  if (!capacity) return;
  size_t used = 0;
  const char hex[] = "0123456789ABCDEF";
  const uint8_t count = uid.size <= 10 ? uid.size : 0;
  for (uint8_t i = 0; i < count; ++i) {
    if (spaced && i) { if (used + 1 >= capacity) break; out[used++] = ' '; }
    if (used + 2 >= capacity) break;
    out[used++] = hex[uid.bytes[i] >> 4];
    out[used++] = hex[uid.bytes[i] & 15];
  }
  out[used] = '\0';
}

bool registryBlobValid(const RegistryData &data) {
  if (data.magic != REGISTRY_MAGIC || data.version != REGISTRY_VERSION ||
      !data.activeMask || (data.activeMask & ~ALL_SHAPES_MASK)) return false;
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s) {
    for (uint8_t r = 0; r < READER_COUNT; ++r) {
      const Uid &uid = data.tags[s][r];
      if (uid.size && !uidValid(uid)) return false;
      if (!uid.size) continue;
      for (uint8_t t = 0; t < SHAPE_COUNT; ++t)
        for (uint8_t u = 0; u < READER_COUNT; ++u)
          if ((s != t || r != u) && uidEqual(uid, data.tags[t][u])) return false;
    }
  }
  return true;
}

void registryBegin() {
  registryData = {};
  registryData.magic = REGISTRY_MAGIC;
  registryData.version = REGISTRY_VERSION;
  registryData.activeMask = DEFAULT_ACTIVE_MASK;
  // Kekalkan ruang simpanan asal supaya UID sedia ada terus boleh dimuatkan.
  registryStorageReady = registryPreferences.begin("geomath_q2", false);
  if (!registryStorageReady) {
    Serial.println(F("[ERROR] NVS tidak boleh dibuka; pendaftaran tidak akan dipalsukan sebagai tersimpan."));
    return;
  }
  const size_t length = registryPreferences.getBytesLength("registry");
  if (!length) return; // Boot pertama: daftar UID sebenar untuk jenis yang digunakan.
  RegistryData loaded = {};
  if (length == sizeof(loaded) &&
      registryPreferences.getBytes("registry", &loaded, sizeof(loaded)) == sizeof(loaded) &&
      registryBlobValid(loaded)) {
    registryData = loaded;
    Serial.println(F("[NVS] UID dan pilihan bongkah dimuatkan."));
  } else {
    Serial.println(F("[ERROR] Simpanan tidak sah/versi berbeza; guna default kosong. Daftar semula."));
  }
}

bool registryCommit(const RegistryData &candidate) {
  if (!registryBlobValid(candidate)) return false;
  if (!registryStorageReady) {
    Serial.println(F("[ERROR] NVS tidak tersedia; tiada perubahan disahkan sebagai tersimpan."));
    return false;
  }
  if (memcmp(&candidate, &registryData, sizeof(candidate)) == 0) return true;
  if (registryPreferences.putBytes("registry", &candidate, sizeof(candidate)) != sizeof(candidate)) {
    Serial.println(F("[ERROR] Gagal menyimpan NVS; tetapan RAM tidak diubah."));
    return false;
  }
  registryData = candidate;
  return true;
}

bool registryReady(Shape shape) {
  if (uint8_t(shape) >= SHAPE_COUNT) return false;
  return uidValid(registryData.tags[uint8_t(shape)][0]) &&
         uidValid(registryData.tags[uint8_t(shape)][1]);
}

bool registryActiveReady() {
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if ((registryData.activeMask & (1U << s)) && !registryReady(Shape(s))) return false;
  return registryData.activeMask != 0;
}

bool registryAssign(uint8_t reader, Shape shape, const Uid &uid) {
  if (reader >= READER_COUNT || uint8_t(shape) >= SHAPE_COUNT || !uidValid(uid)) {
    Serial.println(F("[ERROR] Reader, jenis atau UID tidak sah.")); return false;
  }
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    for (uint8_t r = 0; r < READER_COUNT; ++r)
      if ((s != uint8_t(shape) || r != reader) && uidEqual(uid, registryData.tags[s][r])) {
        Serial.printf("[ERROR] UID sudah untuk R%u %s. Guna unassign dahulu.\n",
                      unsigned(r + 1), shapeName(Shape(s)));
        return false;
      }
  RegistryData candidate = registryData;
  candidate.tags[uint8_t(shape)][reader] = uid;
  if (!registryCommit(candidate)) return false;
  char text[30]; uidFormat(uid, text, sizeof(text), true);
  Serial.printf("[SAVED] R%u %s %s | UID %s\n", unsigned(reader + 1),
                reader == 0 ? "bongkah" : "bentangan", shapeName(shape), text);
  return true;
}

bool registryUnassign(uint8_t reader, Shape shape) {
  if (reader >= 2 || uint8_t(shape) >= SHAPE_COUNT) return false;
  RegistryData candidate = registryData;
  candidate.tags[uint8_t(shape)][reader] = {};
  if (!registryCommit(candidate)) return false;
  Serial.printf("[SAVED] Pendaftaran R%u %s dibuang.\n", unsigned(reader + 1), shapeName(shape));
  return true;
}

bool registrySetActive(uint8_t mask) {
  if (!mask || (mask & ~ALL_SHAPES_MASK)) {
    Serial.println(F("[ERROR] Pilih sekurang-kurangnya satu jenis yang sah.")); return false;
  }
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if ((mask & (1U << s)) && !registryReady(Shape(s))) {
      Serial.printf("[ERROR] %s belum ada dua UID lengkap. Tetapan tidak diubah.\n", shapeName(Shape(s)));
      return false;
    }
  RegistryData candidate = registryData;
  candidate.activeMask = mask;
  return registryCommit(candidate);
}

bool registrySetCount(uint8_t count) {
  if (count < 1 || count > SHAPE_COUNT) return false;
  uint8_t selected = 0, found = 0;
  for (uint8_t s = 0; s < SHAPE_COUNT && found < count; ++s)
    if (registryReady(Shape(s))) { selected |= 1U << s; ++found; }
  if (found != count) {
    Serial.printf("[ERROR] Minta %u jenis, hanya %u pasangan UID lengkap. Tiada perubahan.\n",
                  unsigned(count), unsigned(found)); return false;
  }
  return registrySetActive(selected);
}

Shape registryLookup(const Uid &uid, uint8_t &registeredReader) {
  registeredReader = 255;
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    for (uint8_t r = 0; r < 2; ++r)
      if (uidEqual(uid, registryData.tags[s][r])) { registeredReader = r; return Shape(s); }
  return Shape::NONE;
}

void registryPrintActive() {
  Serial.printf("[ACTIVE] %u jenis | pool=%u | round sehingga %u soalan\n",
                unsigned(maskCount(registryData.activeMask)),
                unsigned(maskCount(registryData.activeMask) * QUESTIONS_PER_SHAPE), unsigned(ROUND_TARGET));
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if (registryData.activeMask & (1U << s))
      Serial.printf("  %s: %s\n", shapeName(Shape(s)), registryReady(Shape(s)) ? "SIAP" : "DAFTAR DUA UID");
}

void registryPrint() {
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    for (uint8_t r = 0; r < 2; ++r) {
      char text[30]; uidFormat(registryData.tags[s][r], text, sizeof(text), true);
      Serial.printf("%s | R%u %s | %s\n", shapeName(Shape(s)), unsigned(r + 1),
                    r == 0 ? "bongkah" : "bentangan", text[0] ? text : "BELUM DAFTAR");
    }
}
