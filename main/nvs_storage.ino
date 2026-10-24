#include "hardware/storage.h"
#include <Preferences.h>

// Persistence adapter owns the namespace/key. Domain/application see typed bytes only.
namespace {
Preferences registryPreferences;
bool nvsOpen() { return registryPreferences.begin("geomath_q2", false); }
size_t nvsLength() { return registryPreferences.getBytesLength("registry"); }
size_t nvsRead(RegistryData &out) {
  return registryPreferences.getBytes("registry", &out, sizeof(out));
}
size_t nvsWrite(const RegistryData &data) {
  return registryPreferences.putBytes("registry", &data, sizeof(data));
}
}
StoragePort nvsStoragePort() { return {nvsOpen, nvsLength, nvsRead, nvsWrite}; }
