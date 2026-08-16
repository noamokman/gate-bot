import { webConfig } from '../framework/environment.js';

export const webBaseUrl = webConfig?.webBaseUrl ?? null;
export const isWebEnabled = Boolean(webConfig);

let telegramUsername: string | undefined;
let resolveTelegramUsername: ((username: string | undefined) => void) | undefined;

const telegramUsernamePromise = new Promise<string | undefined>((resolve) => {
  resolveTelegramUsername = resolve;
});

export const getTelegramUsername = (): string | undefined => telegramUsername;

export const setTelegramUsername = (username?: string): void => {
  telegramUsername = username;
  resolveTelegramUsername?.(username);
};

export const waitForTelegramUsername = (): Promise<string | undefined> => telegramUsernamePromise;
