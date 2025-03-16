import type { MqttClient } from 'mqtt';
import mqtt from 'mqtt';
import { mqttUrl, mqttDiscoveryTopic, mqttCommandTopic } from '../framework/environment.js';
import type { UserInfo } from '../types.js';

const eventType = 'gate_bot_triggered';

let client: MqttClient;

const publishDiscovery = () => {
  if (!client || !mqttDiscoveryTopic || !mqttCommandTopic) {
    return;
  }

  const discoveryPayload = JSON.stringify({
    /* eslint-disable @typescript-eslint/naming-convention */
    name: 'Gate Bot Event',
    unique_id: 'gate_bot_event',
    event_types: [eventType],
    state_topic: 'home/gate_bot/event',
    value_template: '{{ value_json.event_type }}',
    json_attributes_topic: 'home/gate_bot/event',
    device: {
      identifiers: ['gate_bot'],
      name: 'Gate Bot',
      manufacturer: 'Custom',
      model: 'Gate Bot',
    },
    /* eslint-enable @typescript-eslint/naming-convention */
  });

  client.publish(mqttDiscoveryTopic, discoveryPayload, { retain: true });
};

export const initMqtt = async () => {
  if (!mqttUrl) {
    return;
  }

  client = await mqtt.connectAsync(mqttUrl);

  publishDiscovery();
};

export const open = async (userInfo: UserInfo) => {
  if (!client || !mqttCommandTopic) {
    return;
  }

  const eventPayload = JSON.stringify({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    event_type: eventType,
    source: 'telegram_bot',
    action: 'open_gate',
    userInfo,
  });

  await client.publishAsync(mqttCommandTopic, eventPayload);
};
