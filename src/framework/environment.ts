import env from 'env-var';

export const botToken = env.get('BOT_TOKEN').required().asString();
export const allowedUserIds = env.get('ALLOWED_USER_IDS').default('').asArray();
export const gateUrl = env.get('GATE_URL').required().asString();
