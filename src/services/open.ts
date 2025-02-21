import { open as httpOpen } from '../services/http.js';
import { open as mqttOpen } from '../services/mqtt.js';

export const open = async (userId: string) => {
  await Promise.all([httpOpen(userId), mqttOpen()]);
};
