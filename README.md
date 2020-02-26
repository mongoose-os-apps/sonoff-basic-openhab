## A Sonoff Basic firmware to work with openHAB

This firmware drives Sonoff Basic from [iTead Studio](https://www.itead.cc/),
and powered by [Mongoose OS](https://mongoose-os.com/).
It targets to work with openHAB 2.4 or newer using the MQTT binding.

### Features

* LED blink pattern to indicate connectivity
* On board button to toggle the switch manually in case of no connectivity
* Bounce protection
* Device local schedule timer
* Countdown timer to toggle the switch
* Switch ON duration counter for energy consumption analysis
* Night Mode to turn off status LED
* Web interface for setting up WiFi SSID and password
* Reset to firmware defaults by holding the on board button for over 5 seconds

### Configuration options

You have 2 options to implement this firmware:

1. automatic configuration by Homie Convention

[Homie Convention](https://homieiot.github.io/) enables auto-discovery of the device by openHAB.
Things, Channels and Items will be automatically setup.

2. manual configuration with text files

### openHAB UI

![openHAB UI](https://raw.githubusercontent.com/mongoose-os-apps/sonoff-basic-openhab/master/openhab/sonoff-basic-ui.png "openHAB for Android")

![energy consumption chart](https://raw.githubusercontent.com/mongoose-os-apps/sonoff-basic-openhab/master/openhab/energy-chart.png "energy consumption chart")

### Build for Homie support

Build using default cloud service:

```
cat mos-homie.yml > mos.yml
mos build --platform esp8266 \
  --build-var FLASH_SIZE=1048576 --build-var BOARD=esp8266-1M
```

### Build for manual configuration

Build using default cloud service:

```
cat mos-manual.yml > mos.yml
mos build --platform esp8266 \
  --build-var FLASH_SIZE=1048576 --build-var BOARD=esp8266-1M
```

### Flash

Sonoff Basic has only 1Mbytes flash.

	mos flash --esp-flash-params "dout,8m,40m"

### WiFi Setup

1. Switch your PC or smartphone to the device's WiFi network. The SSID is named like **Sonoff_??????**,
and the password is `SonoffBasic`.

2. Use your browser to open http://192.168.4.1/

### openHAB Configuration

If you choose the manual configration option, please check the `manual` folder.

### Local schedule timer

Before using the local timer, make sure to set correct time zone via `timer.tz`.

For Example, a Hong Kong user:

    mos config-set timer.tz=+0800

And a user in California (DST):

    mos config-set timer.tz=-0700

Then, create a JSON file `schedules.json` and upload to the filesystem. Please reference the
supplied sample for syntax.

### Countdown timer

When the countdown timer reached zero, the switch will be toggled.

The local schedule timer will be disabled until the countdown is completed.

### Night Mode

Example: set night mode from 23:00 to 6:30:
    
	mos config-set nm.enable=true nm.bh=23 nm.bm=0 nm.eh=6 nm.em=30

### Reset to firmware defaults

Press and hold the on board button for over 5 seconds.
