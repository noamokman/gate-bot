import type { PendingRequest, UserInfo } from '../types.js';

export interface AdminInfo {
  name?: string;
  email?: string;
  userId?: string;
}

export interface TelegramMessageRef {
  chatId: number;
  messageId: number;
}

export type GateBotEvent =
  | { type: 'gate_opened'; userInfo: UserInfo }
  | { type: 'gate_open_failed'; userInfo: UserInfo; error?: string }
  | { type: 'access_request_created'; request: PendingRequest }
  | {
      type: 'access_request_allowed';
      request: PendingRequest;
      admin?: AdminInfo;
      messageRef?: TelegramMessageRef;
    }
  | {
      type: 'access_request_denied';
      request: PendingRequest;
      admin?: AdminInfo;
      messageRef?: TelegramMessageRef;
    };

type Listener = (event: GateBotEvent) => void | Promise<void>;

const listeners = new Set<Listener>();

export const onEvent = (listener: Listener): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const publish = async (event: GateBotEvent): Promise<void> => {
  await Promise.all(
    [...listeners].map((listener) =>
      Promise.resolve(listener(event)).catch((error) => {
        console.error(`Failed to handle event ${event.type}`, error);
      }),
    ),
  );
};
