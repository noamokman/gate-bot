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

let client: MqttClient | undefined;

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
  if (!mqttCommandTopic) {
    return;
  }

  if (!client) {
    console.error(`MQTT not connected, dropping event ${event.type}`);
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

const attachConnectionLogging = (connection: MqttClient): void => {
  connection.on('connect', () => {
    publishDiscovery();
  });

  connection.on('reconnect', () => {
    console.log('MQTT reconnecting');
  });

  connection.on('close', () => {
    console.log('MQTT connection closed');
  });

  connection.on('offline', () => {
    console.log('MQTT offline');
  });

  connection.on('error', (error) => {
    console.error('MQTT error:', error);
  });
};

export const initMqtt = async (): Promise<void> => {
  if (!mqttUrl) {
    console.log('MQTT skipped: MQTT_URL not set');
    return;
  }

  onEvent(publishEvent);

  client = await mqtt.connectAsync(mqttUrl);

  attachConnectionLogging(client);

  publishDiscovery();

  console.log('MQTT connected');
};
