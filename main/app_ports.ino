#include "application/ports.h"
#include <cstdarg>
#include <cstdio>

namespace { AppPorts boundPorts = {}; }
void appBindPorts(const AppPorts &ports) { boundPorts = ports; }
const AppPorts &appPorts() { return boundPorts; }
void appLogf(const char *format, ...) {
  if (!boundPorts.log) return;
  char text[512];
  va_list args; va_start(args, format);
  std::vsnprintf(text, sizeof(text), format, args);
  va_end(args);
  boundPorts.log(text);
}
