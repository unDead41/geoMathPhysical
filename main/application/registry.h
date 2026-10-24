#pragma once
#include "../domain/registry.h"

const RegistryData &registryState();
bool registryIsStorageReady();
void registryBegin();
bool registryReady(Shape shape);
bool registryActiveReady();
bool registryAssign(uint8_t reader, Shape shape, const Uid &uid);
bool registryUnassign(uint8_t reader, Shape shape);
bool registrySetActive(uint8_t mask);
bool registrySetCount(uint8_t count);
Shape registryLookup(const Uid &uid, uint8_t &registeredReader);
void registryPrint();
void registryPrintActive();
