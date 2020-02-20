/*
 * Logic for sonoff-basic-openhab
 * Author: Michael Fung <hkuser2001 at the gmail service>
*/

// Load Mongoose OS API
load('api_timer.js');
load('api_gpio.js');
load('api_sys.js');
load('api_mqtt.js');
load('api_config.js');
load('api_log.js');
load('api_math.js');
load('api_file.js');
load('api_rpc.js');
load('api_events.js');

// define variables
let thing_id = Cfg.get('mqtt.client_id');
let hab_switch_topic = 'sonoff_basic/' + thing_id;
let hab_skip_once_topic = 'sonoff_basic/' + thing_id + '/skip_once';
let hab_sch_enable_topic = 'sonoff_basic/' + thing_id + '/sch_enable';
let hab_state_topic = 'sonoff_basic/' + thing_id + '/state';
let hab_link_topic = 'sonoff_basic/' + thing_id + '/link';
let led_pin = 13; // Sonoff LED pin
let relay_pin = 12;  // Sonoff relay pin
let spare_pin = 14;  // Sonoff not connected
let button_pin = 0;  // Sonoff push button
let relay_value = 0;
let last_toggle = 0;
let tick_count = 0;
let mqtt_connected = false;
let clock_sync = false;
let relay_last_on_ts = null;
let oncount = 0; // relay ON state duration
let sch_enable = Cfg.get('timer.sch_enable');
let skip_once = false;  // skip next schedule for once
let last_wifi_disconnected = 0; // or Sys.Uptime() if we sure can catch the first cconnected evt

// WiFi Events

// #define MGOS_WIFI_EV_BASE MGOS_EVENT_BASE('W', 'F', 'I')
// #define MGOS_EVENT_GRP_WIFI MGOS_WIFI_EV_BASE

// /* In the comment, the type of `void *ev_data` is specified */
// enum mgos_wifi_event {
//   MGOS_WIFI_EV_STA_DISCONNECTED =
//       MGOS_WIFI_EV_BASE,            /* Arg: mgos_wifi_sta_disconnected_arg */
//   MGOS_WIFI_EV_STA_CONNECTING,      /* Arg: NULL */
//   MGOS_WIFI_EV_STA_CONNECTED,       /* Arg: mgos_wifi_sta_connected_arg */
//   MGOS_WIFI_EV_STA_IP_ACQUIRED,     /* Arg: NULL */
//   MGOS_WIFI_EV_AP_STA_CONNECTED,    /* Arg: mgos_wifi_ap_sta_connected_arg */
//   MGOS_WIFI_EV_AP_STA_DISCONNECTED, /* Arg: mgos_wifi_ap_sta_disconnected_arg */
// };
Event.WIFI = Event.baseNumber('WFI');
Event.MGOS_WIFI_EV_STA_DISCONNECTED = Event.WIFI;
Event.MGOS_WIFI_EV_STA_CONNECTED = Event.WIFI + 2;
Event.MGOS_WIFI_EV_STA_IP_ACQUIRED = Event.WIFI + 3;

// helper functions
let str2int = ffi('int str2int(char *)');

// sntp sync event:
// ref: https://community.mongoose-os.com/t/add-sntp-synced-event/1208?u=michaelfung
let MGOS_EVENT_TIME_CHANGED = Event.SYS + 3;

// calc UTC offset
// NOTE: str2int('08') gives 0
let tz = Cfg.get('timer.tz');
let tz_offset = 0; // in seconds
let tz_sign = tz.slice(0, 1);
tz_offset = (str2int(tz.slice(1, 2)) * 10 * 3600) + (str2int(tz.slice(2, 3)) * 3600) + (str2int(tz.slice(3, 5)) * 60);
if (tz_sign === '-') {
    tz_offset = tz_offset * -1;
}
Log.print(Log.INFO, 'Local time UTC offset: ' + JSON.stringify(tz_offset) + ' seconds');

// init hardware
GPIO.set_mode(relay_pin, GPIO.MODE_OUTPUT);
GPIO.write(relay_pin, 0);  // default to off

GPIO.set_mode(spare_pin, GPIO.MODE_INPUT);
GPIO.set_mode(button_pin, GPIO.MODE_INPUT);

// night mode
let setNightMode = function (val) {
    if (val > 0) {
        GPIO.blink(led_pin, 0, 0); // off, no blink
        Log.print(Log.DEBUG, 'Begin Night Mode');
    } else {
        if (mqtt_connected) {
            GPIO.blink(led_pin, 2800, 200); // normal blink    
        } else {
            GPIO.blink(led_pin, 200, 200); // fast blink    
        }
        Log.print(Log.DEBUG, 'End Night Mode');
    }
};
let nmEnabled = Cfg.get('nm.enable');
let nmBeginHour = Cfg.get('nm.bh');
let nmBeginMinute = Cfg.get('nm.bm');
let nmEndHour = Cfg.get('nm.eh');
let nmEndMinute = Cfg.get('nm.em');
let nmBeginMinOfDay = -1;
let nmEndMinOfDay = -1;

// validate begin - end times
if (nmEnabled) {
    nmBeginMinOfDay = (nmBeginHour * 60) + nmBeginMinute;
    nmEndMinOfDay = (nmEndHour * 60) + nmEndMinute;
    if (nmBeginMinOfDay < 0 || nmEndMinOfDay < 0 || nmBeginMinOfDay > 1440 || nmEndMinOfDay > 1440) {
        nmEnabled = false;
        Log.print(Log.ERROR, 'Begin/End times are invalid. Night Mode disabled!');
    } else {
        Log.print(Log.INFO, 'Begin/End times are good. Night Mode enabled.');
        Log.print(Log.INFO, "Begin Min Of Day: " + JSON.stringify(nmBeginMinOfDay));
        Log.print(Log.INFO, "End Min Of Day: " + JSON.stringify(nmEndMinOfDay));
    }
}

// set RPC command to begin night mode
RPC.addHandler('NM.Begin', function (args) {
    // no args parsing required
    setNightMode(1);
    return JSON.stringify({ result: 'OK' });
});

// set RPC command to end night mode
RPC.addHandler('NM.End', function (args) {
    // no args parsing required
    setNightMode(0);
    return JSON.stringify({ result: 'OK' });
});

// read timer schedules from a json file
let sch = [];

let load_sch = function () {
    sch = [];  // reset sch
    let ok = false;
    let schedules = File.read('schedules.json');
    if (schedules !== null) {
        let sch_obj = JSON.parse(schedules);
        if (sch_obj !== null) {
            sch = sch_obj.sch;
            ok = true;
            Log.print(Log.INFO, 'loaded schedules from file:' + JSON.stringify(sch));
        } else {
            Log.print(Log.ERROR, 'schedule file corrupted.');
        }
    } else {
        Log.print(Log.ERROR, 'schedule file missing.');
    }
    return ok;
};


// set RPC command to reload schedule timer
// call me after a new schedules.json file is put into the fs
RPC.addHandler('ReloadSchedule', function (args) {
    // no args parsing required
    let response = {
        result: load_sch() ? 'OK' : 'Failed'
    };
    return JSON.stringify(response);
});

// notify server of switch state
let update_state = function () {
    let uptime = Sys.uptime();
    if (relay_last_on_ts !== null) {
        oncount += uptime - relay_last_on_ts;
    }
    if (relay_value) {
        relay_last_on_ts = uptime;
    } else {
        relay_last_on_ts = null;
    }

    let pubmsg = JSON.stringify({
        uptime: uptime,
        memory: Sys.free_ram(),
        relay_state: relay_value ? 'ON' : 'OFF',
        oncount: Math.floor(oncount),
        skip_once: skip_once ? 'ON' : 'OFF',
        sch_enable: sch_enable ? 'ON' : 'OFF'
    });
    let ok = MQTT.pub(hab_state_topic, pubmsg, 1, 1);
    Log.print(Log.INFO, 'Published:' + (ok ? 'OK' : 'FAIL') + ' topic:' + hab_state_topic + ' msg:' + pubmsg);
    if (ok) oncount = 0;  // reset ON counter, openHAB take care of statistics logic
};

// set switch with bounce protection
let set_switch = function (value) {
    if ((Sys.uptime() - last_toggle) > 2) {
        GPIO.write(relay_pin, value);
        relay_value = value;
        last_toggle = Sys.uptime();
    } else {
        Log.print(Log.ERROR, 'Bounce protection: operation aborted.');
    }
};

// toggle switch with bounce protection
let toggle_switch = function () {
    if ((Sys.uptime() - last_toggle) > 2) {
        GPIO.toggle(relay_pin);
        relay_value = 1 - relay_value; // 0 1 toggle
        last_toggle = Sys.uptime();
    } else {
        Log.print(Log.ERROR, 'Bounce protection: operation aborted.');
    }
};

// check schedule and fire if time reached
let run_sch = function () {
    Log.print(Log.DEBUG, 'switch schedules:' + JSON.stringify(sch));
    let local_now = Math.floor(Timer.now()) + tz_offset;
    // calc current time of day from mg_time
    let min_of_day = Math.floor((local_now % 86400) / 60);
    // calc current day of week from mg_time
    let day_of_week = Math.floor((local_now % (86400 * 7)) / 86400) + 4; // epoch is Thu
    Log.print(Log.DEBUG, "run_sch: Localized current time is " + JSON.stringify(min_of_day) + " minutes of day " + JSON.stringify(day_of_week));

    if (sch_enable) {
        for (let count = 0; count < sch.length; count++) {
            if (JSON.stringify(min_of_day) === JSON.stringify(sch[count].hour * 60 + sch[count].min)) {
                if (skip_once) {
                    Log.print(Log.INFO, '### run_sch: skip once');
                    skip_once = false;  // reset
                } else {
                    Log.print(Log.INFO, '### run_sch: fire action: ' + sch[count].label);
                    set_switch(sch[count].value);
                    update_state();
                }
            }
        }
    }

    // check night mode schedule
    if (nmEnabled) {
        // Log.print(Log.INFO, 'check night mode schedule, current min of day: ' + JSON.stringify(min_of_day));
        if (nmBeginMinOfDay > nmEndMinOfDay) { // e.g. 2300 - 0630
            if ((min_of_day >= nmBeginMinOfDay) || (min_of_day < nmEndMinOfDay)) {
                setNightMode(1);
            } else {
                setNightMode(0);
            }
        } else {  // e.g. 0800 - 1730
            if ((min_of_day >= nmBeginMinOfDay) && (min_of_day < nmEndMinOfDay)) {
                setNightMode(1);
            } else {
                setNightMode(0);
            }
        }
    }
};

// sonoff button pressed */
GPIO.set_button_handler(button_pin, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 500, function (x) {
    Log.print(Log.DEBUG, 'button pressed');
    toggle_switch();
    update_state();
}, true);

MQTT.sub(hab_switch_topic, function (conn, topic, command) {
    Log.print(Log.DEBUG, 'rcvd sw ctrl msg:' + command);

    if (command === 'ON') {
        set_switch(1);
    } else if (command === 'OFF') {
        set_switch(0);
    } else {
        Log.print(Log.ERROR, 'Unsupported command');
    }
    update_state();
}, null);

MQTT.sub(hab_skip_once_topic, function (conn, topic, command) {
    Log.print(Log.DEBUG, 'rcvd skip once msg:' + command);
    skip_once = (command === 'ON') ? true : false;
    Cfg.set({ timer: { skip_once: skip_once } });
    update_state();
}, null);

MQTT.sub(hab_sch_enable_topic, function (conn, topic, command) {
    Log.print(Log.DEBUG, 'rcvd skip once msg:' + command);
    sch_enable = (command === 'ON') ? true : false;
    Cfg.set({ timer: { sch_enable: sch_enable } });
    update_state();
}, null);

MQTT.setEventHandler(function (conn, ev, edata) {
    if (ev === MQTT.EV_CONNACK) {
        mqtt_connected = true;
        GPIO.blink(led_pin, 2800, 200); // normal blink
        Log.print(Log.INFO, 'MQTT connected');
        // publish to the online topic        
        let ok = MQTT.pub(hab_link_topic, 'ON', 1, 1); // qos=1, retain=1(true)
        Log.print(Log.INFO, 'pub_online_topic:' + (ok ? 'OK' : 'FAIL') + ', msg: ON');
        update_state();
    }
    else if (ev === MQTT.EV_CLOSE) {
        mqtt_connected = false;
        GPIO.blink(led_pin, 200, 200); // fast blink
        Log.print(Log.ERROR, 'MQTT disconnected');
    }
}, null);

// set clock sync flag
Event.addHandler(MGOS_EVENT_TIME_CHANGED, function (ev, evdata, ud) {
    if (Timer.now() > 1577836800 /* 2020-01-01 */) {
        clock_sync = true;
        Log.print(Log.INFO, 'mgos clock event: clock sync ok');
        if (sch_enable) {
            load_sch();
        }
    } else {
        Log.print(Log.INFO, 'mgos clock event: clock not sync yet');
    }
}, null);

// set wifi disconect timer
Event.addHandler(Event.MGOS_WIFI_EV_STA_DISCONNECTED, function (ev, evdata, ud) {
    if (last_wifi_disconnected === 0) {  // this evt will fire if re-connect attempt fail
        last_wifi_disconnected = Sys.uptime();
        Log.print(Log.WARN, "### WiFi disconnected ###");
    }    
}, null);

// reset wifi disconect timer
Event.addHandler(Event.MGOS_WIFI_EV_STA_IP_ACQUIRED, function (ev, evdata, ud) {
    last_wifi_disconnected = 0;
    Log.print(Log.INFO, "Connected and got IP addr");
}, null);

// timer loop to update state and run schedule jobs
let main_loop_timer = Timer.set(1000 /* 1 sec */, true /* repeat */, function () {
    tick_count++;

    if ((tick_count % 60) === 0) { /* 1 min */
        if (clock_sync) run_sch();
        // lost network for too long?
        if (last_wifi_disconnected > 0 && ((Sys.uptime() - last_wifi_disconnected) > 300)) {
            // reboot to workaround wifi reconnect issue
            Log.print(Log.WARN, "reboot to workaround wifi reconnect issue");
            Sys.reboot(500); // reboot in 500 ms
        }
    }

    if ((tick_count % 300) === 0) { /* 5 min */
        tick_count = 0;
        if (mqtt_connected) update_state();
    }
}, null);

// default: fast blink
GPIO.setup_output(led_pin, 1);
GPIO.blink(led_pin, 200, 200);

Log.print(Log.WARN, "### init script started ###");
