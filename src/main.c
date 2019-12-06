#include <stdio.h>
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

bool mqtt_conn_flag = false;
static uint8_t led_timer_ticks = 0;  /* for led blinker use */

int get_led_gpio_pin(void) {
  return ON_BOARD_LED;
}

int mqtt_connected(void) {
	return (int) mqtt_conn_flag;
}

static void blink_on_board_led_cb(void *arg) {
    static uint8_t remainder;

    if (mqtt_conn_flag) {
        remainder = (++led_timer_ticks % 40);
        if (remainder == 0) {
            led_timer_ticks = 0;
            mgos_gpio_write(ON_BOARD_LED, 0);  // on
        } else if (remainder == 1) {
            mgos_gpio_write(ON_BOARD_LED, 1);  // off
        }
    } else {
        mgos_gpio_toggle(ON_BOARD_LED);
    }
    (void) arg;
}

static void mqtt_ev_handler(struct mg_connection *c, int ev, void *p, void *user_data) {
  struct mg_mqtt_message *msg = (struct mg_mqtt_message *) p;
  if (ev == MG_EV_MQTT_CONNACK) {
    LOG(LL_INFO, ("CONNACK: %d", msg->connack_ret_code));
    mqtt_conn_flag = true;
  
  } else if (ev == MG_EV_CLOSE) {
      mqtt_conn_flag = false;
  }
  (void) user_data;
  (void) c;
}

enum mgos_app_init_result mgos_app_init(void) {

  mgos_gpio_set_mode(ON_BOARD_LED, MGOS_GPIO_MODE_OUTPUT);
  mgos_set_timer(100 /* ms */, true /* repeat */, blink_on_board_led_cb, NULL);

  mgos_mqtt_add_global_handler(mqtt_ev_handler, NULL);
  return MGOS_APP_INIT_SUCCESS;
}
