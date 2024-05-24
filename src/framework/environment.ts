import env from 'env-var';

export const botToken = env.get('BOT_TOKEN').required().asString();
export const adminUserIds = env.get('ADMIN_USER_IDS').default('').asSet();
export const gateUrl = env.get('GATE_URL').required().asString();
export const dbPath = env.get('DB_PATH').required().asString();
export const doorCode = env.get('DOOR_CODE').asString();
export const buildNumber = env.get('BUILD_NUMBER').default('0.0.0').asString();
