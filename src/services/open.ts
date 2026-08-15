import type { UserInfo } from '../types.js';
import { open as httpOpen } from '../services/http.js';
import { publish } from './events.js';

export const open = async (userInfo: UserInfo) => {
  try {
    await httpOpen(userInfo);
    await publish({ type: 'gate_opened', userInfo });
  } catch (error) {
    await publish({
      type: 'gate_open_failed',
      userInfo,
      error: error instanceof Error ? error.message : undefined,
    });

    throw error;
  }
};
