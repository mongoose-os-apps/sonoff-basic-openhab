## Manual configuration

### Device setup

After setting the WiFi password with

    mos wifi <SSID> <PASSWORD>

You need to set the device ID and LWT:

```
DEV_ID="sb-01"

mos config-set \
  device.id="${DEV_ID}" \
  mqtt.client_id="${DEV_ID}" \
  mqtt.will_topic="sonoff_basic/${DEV_ID}/link" 
```

## Sample configuration files

Please check the files in the `openhab-conf` folder.
