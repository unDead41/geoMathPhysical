#pragma once
#include "types.h"
#include <cstring>

constexpr uint32_t REGISTRY_MAGIC = 0x474D5132;
constexpr uint16_t REGISTRY_VERSION = 1;

inline const char *shapeName(Shape shape) {
  static const char *const names[] = {"kubus", "piramid", "silinder", "kon", "kuboid"};
  return uint8_t(shape) < SHAPE_COUNT ? names[uint8_t(shape)] : "tidak_dikenali";
}

inline const char *shapeLabel(Shape shape) {
  static const char *const labels[] = {"KUBUS", "PIRAMID S4 SAMA", "SILINDER", "KON", "KUBOID"};
  return uint8_t(shape) < SHAPE_COUNT ? labels[uint8_t(shape)] : "--";
}

// Compact answer name leaves room for "Jawapan: " on a 20-column LCD.
// Question-specific pyramid/base details belong to its explanation rows.
inline const char *shapeShortLabel(Shape shape) {
  return shape == Shape::PYRAMID ? "PIRAMID" : shapeLabel(shape);
}

inline Shape shapeFromName(const char *name) {
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    if (!strcmp(name, shapeName(Shape(s)))) return Shape(s);
  if (!strcmp(name, "cube")) return Shape::CUBE;
  if (!strcmp(name, "pyramid")) return Shape::PYRAMID;
  if (!strcmp(name, "cylinder")) return Shape::CYLINDER;
  if (!strcmp(name, "cone")) return Shape::CONE;
  if (!strcmp(name, "cuboid")) return Shape::CUBOID;
  return Shape::NONE;
}

inline uint8_t shapeBit(Shape shape) {
  return uint8_t(shape) < SHAPE_COUNT ? uint8_t(1U << uint8_t(shape)) : 0;
}

inline uint8_t maskCount(uint8_t mask) {
  uint8_t n = 0;
  while (mask) { n += mask & 1U; mask >>= 1; }
  return n;
}

inline bool uidValid(const Uid &uid) { return uid.size == 4 || uid.size == 7 || uid.size == 10; }
inline bool uidEqual(const Uid &a, const Uid &b) {
  return uidValid(a) && a.size == b.size && memcmp(a.bytes, b.bytes, a.size) == 0;
}

inline bool uidParse(const char *text, Uid &out) {
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

inline void uidFormat(const Uid &uid, char *out, size_t capacity, bool spaced) {
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

inline bool registryBlobValid(const RegistryData &data) {
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

inline bool registryShapeReady(const RegistryData &data, Shape shape) {
  return uint8_t(shape) < SHAPE_COUNT &&
         uidValid(data.tags[uint8_t(shape)][0]) && uidValid(data.tags[uint8_t(shape)][1]);
}

inline Shape registryFind(const RegistryData &data, const Uid &uid, uint8_t &reader) {
  reader = 255;
  for (uint8_t s = 0; s < SHAPE_COUNT; ++s)
    for (uint8_t r = 0; r < READER_COUNT; ++r)
      if (uidEqual(uid, data.tags[s][r])) { reader = r; return Shape(s); }
  return Shape::NONE;
}
