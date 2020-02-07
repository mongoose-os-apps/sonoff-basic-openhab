DEV_ID="em-009"

mos config-set \
  device.id="${DEV_ID}" \
  mqtt.client_id="${DEV_ID}" \
  mqtt.will_topic="sonoff_basic/${DEV_ID}/link" \
  mqtt.will_message="OFF"