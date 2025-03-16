import type { MqttClient } from 'mqtt';
import mqtt from 'mqtt';
import { mqttUrl, mqttDiscoveryTopic, mqttCommandTopic } from '../framework/environment.js';

let client: MqttClient;

const publishDiscovery = () => {
  if (!client || !mqttDiscoveryTopic || !mqttCommandTopic) {
    return;
  }

  const discoveryPayload = JSON.stringify({
    /* eslint-disable @typescript-eslint/naming-convention */
    name: 'Gate Bot Button',
    command_topic: mqttCommandTopic,
    payload_press: 'open',
    unique_id: 'gate_bot_button',
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

export const open = async () => {
  if (!client || !mqttCommandTopic) {
    return;
  }

  await client.publishAsync(mqttCommandTopic, 'open');
};
