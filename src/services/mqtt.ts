import type { MqttClient } from 'mqtt';
import mqtt from 'mqtt';
import { mqttUrl, mqttDiscoveryTopic, mqttCommandTopic, webConfig } from '../framework/environment.js';
import type { GateBotEvent } from './events.js';
import { onEvent } from './events.js';

const source = 'gate_bot';

const webPendingRequestsUrl = webConfig
  ? new URL('admin/pending', `${webConfig.webBaseUrl.replace(/\/+$/, '')}/`).toString()
  : undefined;

const eventTypes = {
  gateOpened: 'gate_bot_triggered',
  gateOpenFailed: 'gate_open_failed',
  accessRequestCreated: 'access_request_created',
  accessRequestAllowed: 'access_request_allowed',
  accessRequestDenied: 'access_request_denied',
} as const;

let client: MqttClient;

const publishDiscovery = () => {
  if (!client || !mqttDiscoveryTopic || !mqttCommandTopic) {
    return;
  }

  const discoveryPayload = JSON.stringify({
    /* eslint-disable @typescript-eslint/naming-convention */
    name: 'Gate Bot Event',
    unique_id: 'gate_bot_event',
    event_types: [...new Set(Object.values(eventTypes))],
    state_topic: mqttCommandTopic,
    json_attributes_topic: mqttCommandTopic,
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

const publishEvent = async (event: GateBotEvent) => {
  if (!client || !mqttCommandTopic) {
    return;
  }

  let payload: Record<string, unknown>;

  switch (event.type) {
    case 'gate_opened': {
      payload = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        event_type: eventTypes.gateOpened,
        source,
        action: 'open_gate',
        userInfo: event.userInfo,
      };
      break;
    }
    case 'gate_open_failed': {
      payload = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        event_type: eventTypes.gateOpenFailed,
        source,
        action: 'open_gate',
        userInfo: event.userInfo,
        error: event.error,
      };
      break;
    }
    case 'access_request_created': {
      payload = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        event_type: eventTypes.accessRequestCreated,
        source,
        request: event.request,
        ...(webPendingRequestsUrl ? { url: webPendingRequestsUrl } : {}),
      };
      break;
    }
    case 'access_request_allowed': {
      payload = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        event_type: eventTypes.accessRequestAllowed,
        source,
        request: event.request,
        admin: event.admin,
      };
      break;
    }
    case 'access_request_denied': {
      payload = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        event_type: eventTypes.accessRequestDenied,
        source,
        request: event.request,
        admin: event.admin,
      };
      break;
    }
  }

  await client.publishAsync(mqttCommandTopic, JSON.stringify(payload));
};

export const initMqtt = async () => {
  if (!mqttUrl) {
    console.log('MQTT skipped: MQTT_URL not set');
    return;
  }

  client = await mqtt.connectAsync(mqttUrl);

  publishDiscovery();

  onEvent(publishEvent);

  console.log('MQTT connected');
};
