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
