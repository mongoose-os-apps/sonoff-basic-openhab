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

enum mgos_app_init_result mgos_app_init(void) {
  return MGOS_APP_INIT_SUCCESS;
}
