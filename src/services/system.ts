import { webConfig } from '../framework/environment.js';

export const webBaseUrl = webConfig?.webBaseUrl ?? null;
export const isWebEnabled = Boolean(webConfig);

let telegramUsername: string | undefined;

export const getTelegramUsername = (): string | undefined => telegramUsername;

export const setTelegramUsername = (username?: string): void => {
  telegramUsername = username;
};
