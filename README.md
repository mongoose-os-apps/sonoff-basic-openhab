## A Sonoff Basic firmware to work with openHAB

This firmware drives Sonoff Basic from [iTead Studio](https://www.itead.cc/),
and powered by [Mongoose OS](https://mongoose-os.com/). It targets to work with openHAB2.

### Features

* LED blink pattern to indicate connectivity
* On board button to control switch manually in case of no connectivity
* Bounce protection
* Device local schedule timer
* switch ON duration counter for energy consumption analysis

### openHAB UI

![openHAB UI](https://raw.githubusercontent.com/mongoose-os-apps/sonoff-basic-openhab/master/openhab/sonoff-basic-ui.png "openHAB for Android")

### Build

Build locally with docker:

	mos build --local --clean --repo ~/git/mongoose-os --arch esp8266

Same as above with source pining to currently downloaded version:

	mos build --local --clean --no-libs-update --repo ~/git/mongoose-os --arch esp8266

### Flash

Sonoff Basic has only 1Mbytes flash.

	mos flash --esp-flash-params "dout,8m,40m"

### Configuration

For example, device ID is **sb-01**

```
DEV_ID="sb-01"
DEV_ADDR="sb-01.lan"

mos --port "ws://${DEV_ADDR}/rpc" config-set \
  device.id="${DEV_ID}" \
  mqtt.client_id="${DEV_ID}" \
  mqtt.will_topic="sonoff_basic/${DEV_ID}/link" \
  mqtt.will_message="OFF"

```


### Setup at openHAB side

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

