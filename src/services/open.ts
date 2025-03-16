import { open as httpOpen } from '../services/http.js';
import { open as mqttOpen } from '../services/mqtt.js';
import type { UserInfo } from '../types.js';

export const open = async (userInfo: UserInfo) => {
  await Promise.all([httpOpen(userInfo), mqttOpen(userInfo)]);
};
