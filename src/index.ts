import 'dotenv/config.js';
import { startTelegramBot } from './bot/app.js';
import { initMqtt } from './services/mqtt.js';
import { startWebServer } from './web/app.js';

const services: [string, Promise<unknown>][] = [
  ['web', startWebServer()],
  ['telegram', startTelegramBot()],
  ['mqtt', initMqtt()],
];

const results = await Promise.allSettled(services.map(([, promise]) => promise));

for (const [index, result] of results.entries()) {
  if (result.status === 'rejected') {
    console.error(`${services[index]?.[0]} failed to start:`, result.reason);
  }
}
