import { dirname, join } from 'node:path';
import env from 'env-var';

export const botToken = env.get('BOT_TOKEN').required().asString();
export const adminUserIds = env.get('ADMIN_USER_IDS').default('').asSet();
export const gateUrl = env.get('GATE_URL').asString();
export const mqttUrl = env.get('MQTT_URL').asString();
export const mqttCommandTopic = env.get('MQTT_COMMAND_TOPIC').asString();
export const mqttDiscoveryTopic = env.get('MQTT_DISCOVERY_TOPIC').asString();
export const dbPath = env.get('DB_PATH').required().asString();
export const doorCode = env.get('DOOR_CODE').asString();
export const buildVersion = env.get('BUILD_VERSION').default('0.0.0').asString();

export interface WebConfig {
  googleClientId: string;
  googleClientSecret: string;
  webSessionSecret: string;
  googleAdminEmails: Set<string>;
  webPort: number;
  webBaseUrl: string;
  webSessionPath: string;
}

const webEnabled = env.get('WEB_ENABLED').default('false').asBool();

export const webConfig: WebConfig | undefined = webEnabled
  ? {
      googleClientId: env.get('GOOGLE_CLIENT_ID').required().asString(),
      googleClientSecret: env.get('GOOGLE_CLIENT_SECRET').required().asString(),
      webSessionSecret: env.get('WEB_SESSION_SECRET').required().asString(),
      googleAdminEmails: env.get('GOOGLE_ADMIN_EMAILS').default('').asSet(),
      webPort: env.get('WEB_PORT').default('3000').asPortNumber(),
      webBaseUrl: env.get('WEB_BASE_URL').required().asString(),
      webSessionPath: env
        .get('WEB_SESSION_PATH')
        .default(join(dirname(dbPath), 'sessions'))
        .asString(),
    }
  : undefined;
