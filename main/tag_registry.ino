#include "application/registry.h"
#include "application/ports.h"
#include <cstring>

namespace {
RegistryData registryData = {};
bool registryStorageReady = false;
}
const RegistryData &registryState() { return registryData; }
bool registryIsStorageReady() { return registryStorageReady; }

void registryBegin() {
  registryData = {};
  registryData.magic = REGISTRY_MAGIC;
  registryData.version = REGISTRY_VERSION;
  registryData.activeMask = DEFAULT_ACTIVE_MASK;
  // Kekalkan ruang simpanan asal supaya UID sedia ada terus boleh dimuatkan.
  registryStorageReady = appPorts().storage.open();
  if (!registryStorageReady) {
    appLogf("[ERROR] NVS tidak boleh dibuka; pendaftaran tidak akan dipalsukan sebagai tersimpan.\n");
    return;
  }
  const size_t length = appPorts().storage.length();
  if (!length) return; // Boot pertama: daftar UID sebenar untuk jenis yang digunakan.
  RegistryData loaded = {};
  if (length == sizeof(loaded) &&
      appPorts().storage.read(loaded) == sizeof(loaded) &&
      registryBlobValid(loaded)) {
    registryData = loaded;
    appLogf("[NVS] UID dan pilihan bongkah dimuatkan.\n");
  } else {
    appLogf("[ERROR] Simpanan tidak sah/versi berbeza; guna default kosong. Daftar semula.\n");
  }
}

static bool registryCommit(const RegistryData &candidate) {
  if (!registryBlobValid(candidate)) return false;
  if (!registryStorageReady) {
    appLogf("[ERROR] NVS tidak tersedia; tiada perubahan disahkan sebagai tersimpan.\n");
    return false;
  }
  if (memcmp(&candidate, &registryData, sizeof(candidate)) == 0) return true;
  if (appPorts().storage.write(candidate) != sizeof(candidate)) {
    appLogf("[ERROR] Gagal menyimpan NVS; tetapan RAM tidak diubah.\n");
    return false;
  }
  registryData = candidate;
  return true;
}

bool registryReady(Shape shape) {
  return registryShapeReady(registryData, shape);
}

bool registryActiveReady() {
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if ((registryData.activeMask & (1U << s)) && !registryReady(Shape(s))) return false;
  return registryData.activeMask != 0;
}

bool registryAssign(uint8_t reader, Shape shape, const Uid &uid) {
  if (reader >= READER_COUNT || uint8_t(shape) >= SHAPE_COUNT || !uidValid(uid)) {
    appLogf("[ERROR] Reader, jenis atau UID tidak sah.\n"); return false;
  }
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    for (uint8_t r = 0; r < READER_COUNT; ++r)
      if ((s != uint8_t(shape) || r != reader) && uidEqual(uid, registryData.tags[s][r])) {
        appLogf("[ERROR] UID sudah untuk R%u %s. Guna unassign dahulu.\n",
                      unsigned(r + 1), shapeName(Shape(s)));
        return false;
      }
  RegistryData candidate = registryData;
  candidate.tags[uint8_t(shape)][reader] = uid;
  if (!registryCommit(candidate)) return false;
  char text[30]; uidFormat(uid, text, sizeof(text), true);
  appLogf("[SAVED] R%u %s %s | UID %s\n", unsigned(reader + 1),
                reader == 0 ? "bongkah" : "bentangan", shapeName(shape), text);
  return true;
}

bool registryUnassign(uint8_t reader, Shape shape) {
  if (reader >= 2 || uint8_t(shape) >= SHAPE_COUNT) return false;
  RegistryData candidate = registryData;
  candidate.tags[uint8_t(shape)][reader] = {};
  if (!registryCommit(candidate)) return false;
  appLogf("[SAVED] Pendaftaran R%u %s dibuang.\n", unsigned(reader + 1), shapeName(shape));
  return true;
}

bool registrySetActive(uint8_t mask) {
  if (!mask || (mask & ~ALL_SHAPES_MASK)) {
    appLogf("[ERROR] Pilih sekurang-kurangnya satu jenis yang sah.\n"); return false;
  }
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if ((mask & (1U << s)) && !registryReady(Shape(s))) {
      appLogf("[ERROR] %s belum ada dua UID lengkap. Tetapan tidak diubah.\n", shapeName(Shape(s)));
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
    appLogf("[ERROR] Minta %u jenis, hanya %u pasangan UID lengkap. Tiada perubahan.\n",
                  unsigned(count), unsigned(found)); return false;
  }
  return registrySetActive(selected);
}

Shape registryLookup(const Uid &uid, uint8_t &registeredReader) {
  return registryFind(registryData, uid, registeredReader);
}

void registryPrintActive() {
  appLogf("[ACTIVE] %u jenis | pool=%u | round sehingga %u soalan\n",
                unsigned(maskCount(registryData.activeMask)),
                unsigned(maskCount(registryData.activeMask) * QUESTIONS_PER_SHAPE), unsigned(ROUND_TARGET));
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if (registryData.activeMask & (1U << s))
      appLogf("  %s: %s\n", shapeName(Shape(s)), registryReady(Shape(s)) ? "SIAP" : "DAFTAR DUA UID");
}

void registryPrint() {
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    for (uint8_t r = 0; r < 2; ++r) {
      char text[30]; uidFormat(registryData.tags[s][r], text, sizeof(text), true);
      appLogf("%s | R%u %s | %s\n", shapeName(Shape(s)), unsigned(r + 1),
                    r == 0 ? "bongkah" : "bentangan", text[0] ? text : "BELUM DAFTAR");
    }
}

