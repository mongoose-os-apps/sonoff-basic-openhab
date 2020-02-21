#include <stdio.h>
#include <stdlib.h>
#include "mgos.h"
#include "mgos_app.h"
#include "mgos_dlsym.h"
#include "mgos_hal.h"
#include "mjs.h"

// helper functions for ffi
int str2int(char *c) {
  return (int) strtol(c,NULL,10);
}

void reset_firmware_defaults() {
  LOG(LL_INFO, ("Reset to firmaware defaults"));
  mgos_config_reset(MGOS_CONFIG_LEVEL_USER);
  mgos_fs_gc();
  mgos_system_restart_after(100);
}

enum mgos_app_init_result mgos_app_init(void) {
  return MGOS_APP_INIT_SUCCESS;
}
