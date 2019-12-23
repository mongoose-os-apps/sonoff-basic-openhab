## A Sonoff Basic firmware to work with openHAB

This firmware drives Sonoff Basic from [iTead Studio](https://www.itead.cc/),
and powered by [Mongoose OS](https://mongoose-os.com/).
It targets to work with openHAB2 using the v1.x MQTT binding.

If you happen to use or like the 2.4+ newer version of the MQTT binding, you might like to check
[this example](https://github.com/mongoose-os-apps/sonoff-basic-openhab2) instead, as it takes advantage of the auto-discovery capability of the Homie Convention; you will be guided to come back here if needed. Nevertheless, you may use this example on that same setup.

### Features

* LED blink pattern to indicate connectivity
* On board button to control switch manually in case of no connectivity
* Bounce protection
* Device local schedule timer
* Switch ON duration counter for energy consumption analysis
* Night Mode to turn off status LED

### openHAB UI

![openHAB UI](https://raw.githubusercontent.com/mongoose-os-apps/sonoff-basic-openhab/master/openhab/sonoff-basic-ui.png "openHAB for Android")

![energy consumption chart](https://raw.githubusercontent.com/mongoose-os-apps/sonoff-basic-openhab/master/openhab/energy-chart.png "energy consumption chart")

### Build

Build using default cloud service:

    mos build --platform esp8266

Build locally with docker:

	mos build --local --clean --repo ~/git/mongoose-os --platform esp8266

Same as above with source pining to currently downloaded version:

	mos build --local --clean --no-libs-update --repo ~/git/mongoose-os --platform esp8266

### Flash

Sonoff Basic has only 1Mbytes flash.

	mos flash --esp-flash-params "dout,8m,40m"

### Configuration

For example, device ID is **sb-01**

```
DEV_ID="sb-01"

mos config-set \
  device.id="${DEV_ID}" \
  mqtt.client_id="${DEV_ID}" \
  mqtt.will_topic="sonoff_basic/${DEV_ID}/link" \
  mqtt.will_message="OFF"

```

### Local schedule timer

Before using the local timer, make sure to set correct time zone via `timer.tz`.

For Example, a Hong Kong user:

    mos config-set timer.tz=+0800

And a user in California (DST):

    mos config-set timer.tz=-0700

Then, create a JSON file `schedules.json` and upload to the filesystem. Please reference the
supplied sample for syntax.

### Night Mode

Example: set night mode from 23:00 to 6:30:
    
	mos config-set nm.enable=true nm.bh=23 nm.bm=0 nm.eh=6 nm.em=30

### Setup at openHAB side for pre 2.4 or 1.x binding

If we use the locally installed mosquitto server, the MQTT broker can be configured as follows:

```
mqtt:local_broker.url=tcp://localhost:1883
mqtt:local_broker.clientId=openhab
mqtt:local_broker.retain=false
mqtt:local_broker.qos=0
mqtt:local_broker.async=false
mqtt:local_broker.user=openhab
mqtt:local_broker.pwd=test1234

```

Add these to items:

```
Switch Bedroom_Lights_Switch {mqtt=">[local_broker:sonoff_basic/sb-01:command:*:${command}], <[local_broker:sonoff_basic/sb-01/state:state:JSONPATH($.relay_state)]"}
Number Bedroom_Lights_Switch_RAM {mqtt="<[local_broker:sonoff_basic/sb-01/state:state:JSONPATH($.memory)]"}
String Bedroom_Lights_Switch_Uptime {mqtt="<[local_broker:sonoff_basic/sb-01/state:state:JS(formatTimestamp.js)]"}
Number Bedroom_Lights_Switch_OnCount {mqtt="<[local_broker:sonoff_basic/sb-01/state:state:JSONPATH($.oncount)]"}
Number Bedroom_Lights_Switch_Daily_Usage "Daily switch ON time in minutes"
Switch Bedroom_Lights_Switch_Health "Indictate device health"
```

Also add these entries to sitemap like this:

```
sitemap default label="Home Sweet Home"
{

	Frame label="Bedroom" {
		Switch item=Bedroom_Lights_Switch label="Light Switch" icon="light"
		Text item=Bedroom_Lights_Switch_RAM label="RAM Free [%d bytes]" icon="line-stagnation"
		Text item=Bedroom_Lights_Switch_Uptime label="Uptime [%s]" icon="line-stagnation"
		Text item=Bedroom_Lights_Switch_Daily_Usage label="Total ON Time today [%.0f min]" icon="line-stagnation"
		Text item=Bedroom_Lights_Switch_Health label="Health" icon="network"
	}
}
```

Please find related rules and scripts inside the openhab folder.

### Setup at openHAB side for 2.4 and later with the 2.x binding

As explained in [this example](https://github.com/mongoose-os-apps/sonoff-basic-openhab2), the broker can be discovered and graphically added.

You can configure your items and switches as depicted above, but first you need to manually add a Thing and its Channels. You will do that graphically at the Paper UI; first add a New Thing, then MQTT Binding, then Generic MQTT Thing. Select your bridge (your broker) and save it. Then select your Generic MQTT Thing and add a Channel for every item you will use.
Finally, use those channel ids in the items file above.
It is clearly explained [here](https://community.openhab.org/t/migrating-mqtt1-items-to-mqtt2-4-items/60502).

Again, if you use the 2.4+ version of the MQTT binding, you might check [this example](https://github.com/mongoose-os-apps/sonoff-basic-openhab2) instead.
