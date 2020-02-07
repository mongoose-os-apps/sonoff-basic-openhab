#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#include "mgos.h"
#include "mgos_app.h"
#include "mgos_dlsym.h"
#include "mgos_gpio.h"
#include "mgos_hal.h"
#include "mgos_mqtt.h"
#include "mgos_sys_config.h"
#include "mgos_timers.h"
#include "mjs.h"

static int ON_BOARD_LED = 13; /* sonoff basic LED pin */

int get_led_gpio_pin(void) {
  return ON_BOARD_LED;
}

// helper functions for ffi
int str2int(char *c) {
  return (int) strtol(c,NULL,10);
}

enum mgos_app_init_result mgos_app_init(void) {
  return MGOS_APP_INIT_SUCCESS;
}
